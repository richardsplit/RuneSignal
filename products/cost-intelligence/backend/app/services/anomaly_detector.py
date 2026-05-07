"""
Module 6: Anomaly Detector
14-day rolling baseline per endpoint, 3-sigma detection, 15-minute cadence.
Deduplication: max 1 alert per endpoint per 4 hours.
"""
from __future__ import annotations

import asyncio
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from ..config import get_settings
from ..db import get_db

logger = logging.getLogger(__name__)

BASELINE_DAYS        = 14
SIGMA_THRESHOLD      = 3.0
ALERT_COOLDOWN_HOURS = 4
CHECK_INTERVAL_MIN   = 15


# ── Baseline ───────────────────────────────────────────────────────────────────

async def update_baseline(tenant_id: str, endpoint_id: str) -> dict[str, float]:
    """
    Compute mean and std-dev of cost_usd/hour for the endpoint over the last
    BASELINE_DAYS days. Returns {"mean": float, "stddev": float, "samples": int}.
    """
    db = await get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=BASELINE_DAYS)).isoformat()

    rows = (
        await db.table("ci_inference_logs")
        .select("cost_usd,created_at")
        .eq("tenant_id", tenant_id)
        .eq("endpoint_id", endpoint_id)
        .gte("created_at", since)
        .execute()
    ).data or []

    if len(rows) < 10:
        return {"mean": 0.0, "stddev": 0.0, "samples": len(rows)}

    # Bucket by hour
    hourly: dict[str, float] = {}
    for r in rows:
        hour = r["created_at"][:13]  # "2024-01-15T14"
        hourly[hour] = hourly.get(hour, 0.0) + float(r.get("cost_usd") or 0)

    values = list(hourly.values())
    n = len(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    stddev = math.sqrt(variance)

    return {"mean": round(mean, 8), "stddev": round(stddev, 8), "samples": n}


# ── Detection ──────────────────────────────────────────────────────────────────

async def check_for_anomalies(tenant_id: str) -> list[dict[str, Any]]:
    """
    Check all endpoints for the tenant. Returns list of anomaly dicts.
    Run every 15 minutes.
    """
    db = await get_db()
    now = datetime.now(timezone.utc)
    window_start = (now - timedelta(hours=1)).isoformat()

    # Get distinct endpoints with activity in last hour
    recent = (
        await db.table("ci_inference_logs")
        .select("endpoint_id,cost_usd")
        .eq("tenant_id", tenant_id)
        .gte("created_at", window_start)
        .not_.is_("endpoint_id", "null")
        .execute()
    ).data or []

    if not recent:
        return []

    # Aggregate cost by endpoint for last hour
    current_hour: dict[str, float] = {}
    for r in recent:
        ep = r["endpoint_id"]
        current_hour[ep] = current_hour.get(ep, 0.0) + float(r.get("cost_usd") or 0)

    anomalies: list[dict[str, Any]] = []

    for endpoint_id, current_cost in current_hour.items():
        baseline = await update_baseline(tenant_id, endpoint_id)
        mean, stddev = baseline["mean"], baseline["stddev"]

        if stddev == 0 or baseline["samples"] < 5:
            continue  # not enough data for reliable detection

        z_score = (current_cost - mean) / stddev

        if z_score < SIGMA_THRESHOLD:
            continue  # within normal range

        # Check deduplication
        cooldown_since = (now - timedelta(hours=ALERT_COOLDOWN_HOURS)).isoformat()
        existing = (
            await db.table("ci_anomaly_alerts")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("endpoint_id", endpoint_id)
            .gte("created_at", cooldown_since)
            .maybe_single()
            .execute()
        )
        if existing.data:
            continue  # already alerted recently

        severity = "critical" if z_score > 5.0 else "high" if z_score > 4.0 else "medium"
        monthly_overrun = round((current_cost - mean) * 24 * 30, 2)

        alert = {
            "tenant_id": tenant_id,
            "endpoint_id": endpoint_id,
            "z_score": round(z_score, 2),
            "current_cost_usd": round(current_cost, 6),
            "baseline_mean_usd": round(mean, 6),
            "baseline_stddev_usd": round(stddev, 6),
            "severity": severity,
            "estimated_monthly_overrun_usd": monthly_overrun,
            "status": "active",
        }
        anomalies.append(alert)

        # Persist alert
        try:
            await db.table("ci_anomaly_alerts").insert(alert).execute()
        except Exception as exc:
            logger.exception("Failed to insert anomaly alert: %s", exc)

    return anomalies


# ── Alerting ───────────────────────────────────────────────────────────────────

async def _send_slack(webhook_url: str, alert: dict[str, Any]) -> None:
    payload = {
        "text": (
            f":rotating_light: *AI Cost Anomaly — {alert['severity'].upper()}*\n"
            f"Endpoint: `{alert['endpoint_id']}`\n"
            f"Current cost/hr: `${alert['current_cost_usd']:.4f}` "
            f"(baseline: `${alert['baseline_mean_usd']:.4f}`, z={alert['z_score']}σ)\n"
            f"Estimated monthly overrun: *${alert['estimated_monthly_overrun_usd']:,.2f}*"
        )
    }
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(webhook_url, json=payload)
    except Exception as exc:
        logger.debug("Slack webhook failed: %s", exc)


async def _send_email_alert(tenant_email: str, alert: dict[str, Any]) -> None:
    from .email_service import send_email  # noqa: PLC0415

    subject = f"⚠️ AI cost spike on {alert['endpoint_id']} ({alert['z_score']}σ above baseline)"
    html = f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#e2e8f0;background:#0d1117;padding:24px;border-radius:12px;">
  <h2 style="color:#ef4444;margin:0 0 16px">AI Cost Anomaly Detected</h2>
  <p><strong>Endpoint:</strong> {alert['endpoint_id']}</p>
  <p><strong>Severity:</strong> {alert['severity'].upper()}</p>
  <p><strong>Current cost/hr:</strong> ${alert['current_cost_usd']:.4f}
     ({alert['z_score']}σ above {BASELINE_DAYS}-day baseline of ${alert['baseline_mean_usd']:.4f}/hr)</p>
  <p><strong>Estimated monthly overrun:</strong> ${alert['estimated_monthly_overrun_usd']:,.2f}</p>
  <a href="{get_settings().app_url}/ci/alerts" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:8px;">
    View alerts dashboard →
  </a>
</div>
"""
    await send_email(tenant_email, subject, html)


async def alert_anomalies(tenant_id: str, tenant_email: str, slack_webhook: str | None = None) -> None:
    """
    Run anomaly detection and dispatch alerts. Called by APScheduler every 15 min.
    """
    anomalies = await check_for_anomalies(tenant_id)

    for alert in anomalies:
        tasks: list[asyncio.Task] = []
        if slack_webhook:
            tasks.append(asyncio.create_task(_send_slack(slack_webhook, alert)))
        tasks.append(asyncio.create_task(_send_email_alert(tenant_email, alert)))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    if anomalies:
        logger.info("Dispatched %d anomaly alerts for tenant %s", len(anomalies), tenant_id)
