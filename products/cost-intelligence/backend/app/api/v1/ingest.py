"""
POST /v1/ingest/log  — single inference log
POST /v1/ingest/batch — bulk inference logs (up to 500)

Triggers 24h "first dangerous customer" email job on first log from a new tenant.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from ...db import get_db
from ...middleware.auth import TenantDep
from ...models.schemas import BatchIngestPayload, InferenceLogPayload, IngestResponse
from ...services.job_scheduler import enqueue_first_dangerous_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])


def _row(payload: InferenceLogPayload, tenant_id: str) -> dict:
    return {
        "tenant_id": tenant_id,
        "customer_id": payload.customer_id,
        "feature_tag": payload.feature_tag,
        "endpoint_id": payload.endpoint_id,
        "model": payload.model,
        "provider": payload.provider,
        "input_tokens": payload.input_tokens,
        "output_tokens": payload.output_tokens,
        "cached_tokens": payload.cached_tokens,
        "reasoning_tokens": payload.reasoning_tokens,
        "cost_usd": payload.cost_usd,
        "latency_ms": payload.latency_ms,
        "session_id": payload.session_id,
        "request_id": payload.request_id,
        "metadata": payload.metadata,
    }


async def _mark_first_log_and_maybe_enqueue(tenant: dict, bg: BackgroundTasks) -> None:
    """If this is the tenant's first log, record the timestamp and enqueue the 24h email."""
    if tenant.get("first_log_received_at"):
        return  # already processed

    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.table("ci_tenants").update({"first_log_received_at": now}).eq("id", tenant["id"]).execute()

    # Enqueue background job to fire 24h from now
    bg.add_task(enqueue_first_dangerous_email, tenant_id=tenant["id"], tenant_email=tenant["email"])
    logger.info("Tenant %s received first log — 24h email job enqueued", tenant["id"])


@router.post("/log", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_log(
    payload: InferenceLogPayload,
    tenant: TenantDep,
    bg: BackgroundTasks,
) -> IngestResponse:
    db = await get_db()

    try:
        await db.table("ci_inference_logs").insert(_row(payload, tenant["id"])).execute()
    except Exception as exc:
        logger.exception("Failed to insert inference log for tenant %s", tenant["id"])
        raise HTTPException(status_code=500, detail="Failed to store log") from exc

    await _mark_first_log_and_maybe_enqueue(tenant, bg)
    return IngestResponse(ok=True, inserted=1)


@router.post("/batch", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_batch(
    payload: BatchIngestPayload,
    tenant: TenantDep,
    bg: BackgroundTasks,
) -> IngestResponse:
    rows = [_row(log, tenant["id"]) for log in payload.logs]

    db = await get_db()
    try:
        # Insert in chunks of 100 to stay within Supabase payload limits
        chunk_size = 100
        for i in range(0, len(rows), chunk_size):
            await db.table("ci_inference_logs").insert(rows[i : i + chunk_size]).execute()
    except Exception as exc:
        logger.exception("Failed to batch insert %d logs for tenant %s", len(rows), tenant["id"])
        raise HTTPException(status_code=500, detail="Failed to store batch") from exc

    await _mark_first_log_and_maybe_enqueue(tenant, bg)
    return IngestResponse(ok=True, inserted=len(rows))
