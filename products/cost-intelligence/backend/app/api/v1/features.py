"""GET /v1/features — feature profitability heatmap"""
from __future__ import annotations
from dataclasses import asdict
from fastapi import APIRouter, Query
from ...middleware.auth import TenantDep
from ...services.feature_profitability import get_feature_margins

router = APIRouter(prefix="/features", tags=["features"])


@router.get("")
async def feature_margins(
    tenant: TenantDep,
    month: str | None = Query(default=None, description="YYYY-MM"),
):
    results = await get_feature_margins(tenant["id"], month)
    return {
        "month": month,
        "features": [asdict(f) for f in results],
        "total_features": len(results),
        "dangerous_count": sum(1 for f in results if f.margin_status in ("negative", "warning")),
        "total_savings_potential_usd": round(sum(f.savings_potential_usd for f in results), 2),
    }
