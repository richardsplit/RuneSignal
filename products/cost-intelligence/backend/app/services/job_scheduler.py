"""
Lightweight job scheduler using APScheduler.
Handles the 24h "first dangerous customer" email and hourly MV refresh.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from ..db import get_db

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


async def _run_first_dangerous_email(tenant_id: str, tenant_email: str) -> None:
    """Executed 24h after first log — imports here to avoid circular imports."""
    from .email_service import send_first_dangerous_customer_email  # noqa: PLC0415

    logger.info("Running first-dangerous-customer email job for tenant %s", tenant_id)
    await send_first_dangerous_customer_email(tenant_id, tenant_email)

    # Mark job done in db
    db = await get_db()
    await (
        db.table("ci_job_queue")
        .update({"status": "done", "completed_at": datetime.now(timezone.utc).isoformat()})
        .eq("payload->>tenant_id", tenant_id)
        .eq("job_type", "first_dangerous_email")
        .eq("status", "running")
        .execute()
    )


async def enqueue_first_dangerous_email(tenant_id: str, tenant_email: str) -> None:
    """
    Schedule the first-dangerous-customer email to fire 24 hours from now.
    Idempotent — won't double-enqueue if called again.
    """
    db = await get_db()

    # Idempotency: check if job already exists
    existing = (
        await db.table("ci_job_queue")
        .select("id")
        .eq("job_type", "first_dangerous_email")
        .eq("payload->>tenant_id", tenant_id)
        .in_("status", ["pending", "running", "done"])
        .maybe_single()
        .execute()
    )
    if existing.data:
        logger.debug("first_dangerous_email job already exists for tenant %s", tenant_id)
        return

    run_at = datetime.now(timezone.utc).replace(microsecond=0)
    # 24 hours from now
    import datetime as dt  # noqa: PLC0415
    run_at = run_at + dt.timedelta(hours=24)
    run_at_iso = run_at.isoformat()

    # Persist to job queue
    await db.table("ci_job_queue").insert({
        "job_type": "first_dangerous_email",
        "payload": {"tenant_id": tenant_id, "tenant_email": tenant_email},
        "status": "pending",
        "run_at": run_at_iso,
    }).execute()

    # Also schedule in APScheduler (in-process, lost on restart — db queue is source of truth)
    scheduler.add_job(
        _run_first_dangerous_email,
        trigger=DateTrigger(run_date=run_at),
        args=[tenant_id, tenant_email],
        id=f"fdc_{tenant_id}",
        replace_existing=True,
        misfire_grace_time=3600,  # fire up to 1h late if pod was down
    )
    logger.info("Enqueued first_dangerous_email for tenant %s at %s", tenant_id, run_at_iso)


async def _refresh_materialized_views() -> None:
    """Hourly job to refresh materialized views."""
    db = await get_db()
    try:
        await db.rpc("ci_refresh_materialized_views").execute()
        logger.info("Materialized views refreshed")
    except Exception as exc:
        logger.exception("Failed to refresh materialized views: %s", exc)


async def _replay_pending_jobs() -> None:
    """
    On startup, replay any pending jobs from the database queue
    that were not executed (e.g., pod restart).
    """
    db = await get_db()
    rows = (
        await db.table("ci_job_queue")
        .select("*")
        .eq("status", "pending")
        .execute()
    ).data or []

    import datetime as dt  # noqa: PLC0415
    now = datetime.now(timezone.utc)

    for row in rows:
        job_type = row["job_type"]
        payload  = row["payload"]
        run_at_str = row.get("run_at")

        if job_type == "first_dangerous_email":
            if run_at_str:
                run_at = datetime.fromisoformat(run_at_str.replace("Z", "+00:00"))
            else:
                run_at = now + dt.timedelta(minutes=1)

            scheduler.add_job(
                _run_first_dangerous_email,
                trigger=DateTrigger(run_date=max(run_at, now + dt.timedelta(seconds=5))),
                args=[payload["tenant_id"], payload["tenant_email"]],
                id=f"fdc_{payload['tenant_id']}",
                replace_existing=True,
                misfire_grace_time=3600,
            )


def start_scheduler() -> None:
    """Call once at application startup."""
    # Hourly MV refresh (at :05 of every hour)
    scheduler.add_job(
        _refresh_materialized_views,
        trigger=CronTrigger(minute=5),
        id="mv_refresh",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started")

    # Replay any pending jobs from DB
    asyncio.create_task(_replay_pending_jobs())
