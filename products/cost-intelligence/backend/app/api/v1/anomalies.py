"""
GET  /v1/anomalies        — active anomaly alerts
GET  /v1/anomalies/history — alert history
POST /v1/anomalies/check  — run detection now (for testing)
PUT  /v1/anomalies/{id}/resolve — mark resolved
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ...middleware.auth import TenantDep
from ...db import get_db
from ...services.anomaly_detector import check_for_anomalies

router = APIRouter(prefix="/anomalies", tags=["anomalies"])


class AlertConfigUpdate(BaseModel):
    slack_webhook_url: str | None = None
    pagerduty_key: str | None = None
    email_enabled: bool = True


@router.get("")
async def active_alerts(tenant: TenantDep):
    db = await get_db()
    rows = (
        await db.table("ci_anomaly_alerts")
        .select("*")
        .eq("tenant_id", tenant["id"])
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    ).data or []
    return {"alerts": rows, "count": len(rows)}


@router.get("/history")
async def alert_history(tenant: TenantDep):
    db = await get_db()
    rows = (
        await db.table("ci_anomaly_alerts")
        .select("*")
        .eq("tenant_id", tenant["id"])
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    ).data or []
    return {"alerts": rows, "count": len(rows)}


@router.post("/check")
async def run_check(tenant: TenantDep):
    """Manually trigger anomaly detection — useful for testing."""
    anomalies = await check_for_anomalies(tenant["id"])
    return {"detected": len(anomalies), "anomalies": anomalies}


@router.put("/{alert_id}/resolve")
async def resolve_alert(alert_id: str, tenant: TenantDep):
    db = await get_db()
    result = (
        await db.table("ci_anomaly_alerts")
        .update({"status": "resolved"})
        .eq("id", alert_id)
        .eq("tenant_id", tenant["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True, "id": alert_id}
