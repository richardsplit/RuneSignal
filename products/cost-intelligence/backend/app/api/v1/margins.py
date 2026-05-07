"""
GET /v1/margins          — customer margin table (default: current month)
GET /v1/margins/models   — AI spend by model
GET /v1/margins/trend    — 6-month cost vs revenue trend
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query

from ...db import get_db
from ...middleware.auth import TenantDep
from ...models.schemas import MarginSummary
from ...services.attribution_engine import get_customer_margins

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/margins", tags=["margins"])


@router.get("", response_model=MarginSummary)
async def customer_margins(
    tenant: TenantDep,
    month: str | None = Query(default=None, description="YYYY-MM format"),
) -> MarginSummary:
    """Customer margin table — sorted worst first."""
    return await get_customer_margins(tenant["id"], month)


@router.get("/models")
async def model_spend(
    tenant: TenantDep,
    month: str | None = Query(default=None, description="YYYY-MM format"),
) -> dict[str, Any]:
    """AI spend grouped by model for the given month."""
    from ...services.attribution_engine import _parse_month, _next_month  # noqa: PLC0415

    target = _parse_month(month)
    db = await get_db()

    rows = (
        await db.table("ci_model_cost_summary")
        .select("model,provider,request_count,total_cost_usd,avg_cost_per_request,total_input_tokens,total_output_tokens")
        .eq("tenant_id", tenant["id"])
        .gte("month", f"{target}-01")
        .lt("month", _next_month(target))
        .execute()
    ).data or []

    total_cost = sum(float(r.get("total_cost_usd") or 0) for r in rows)

    models = [
        {
            **r,
            "cost_share_pct": round(float(r.get("total_cost_usd") or 0) / total_cost * 100, 2)
            if total_cost > 0 else 0.0,
        }
        for r in rows
    ]
    models.sort(key=lambda x: float(x.get("total_cost_usd") or 0), reverse=True)

    return {"month": target, "total_cost_usd": total_cost, "models": models}


@router.get("/trend")
async def six_month_trend(
    tenant: TenantDep,
) -> dict[str, Any]:
    """Last 6 months AI cost vs MRR — for the trend chart."""
    db = await get_db()
    rows = (
        await db.table("ci_six_month_trend")
        .select("month,ai_cost_usd,revenue_usd,gross_margin_pct")
        .eq("tenant_id", tenant["id"])
        .order("month", desc=False)
        .execute()
    ).data or []

    return {
        "months": [
            {
                "month": r["month"][:7] if r.get("month") else None,
                "ai_cost_usd": float(r.get("ai_cost_usd") or 0),
                "revenue_usd": float(r.get("revenue_usd") or 0),
                "gross_margin_pct": float(r["gross_margin_pct"]) if r.get("gross_margin_pct") is not None else None,
            }
            for r in rows
        ]
    }
