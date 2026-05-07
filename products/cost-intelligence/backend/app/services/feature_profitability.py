"""
Module 5: Feature Profitability Monitor
Groups inference logs by feature_tag to show which product features
are bleeding margin — and by how much.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from ..db import get_db
from ..services.attribution_engine import _parse_month, _next_month

logger = logging.getLogger(__name__)

MARGIN_THRESHOLDS = {
    "healthy":    30.0,   # > 30 %
    "acceptable": 10.0,   # 10–30 %
    "warning":    0.0,    # 0–10 %
    # "negative"  < 0 %
}

MODEL_CHEAPER: dict[str, str] = {
    "gpt-4o":                  "gpt-4o-mini",
    "gpt-4.1":                 "gpt-4o-mini",
    "claude-3-5-sonnet":       "claude-3-5-haiku",
    "claude-3-opus":           "claude-3-5-haiku",
    "gemini-2.5-pro":          "gemini-2.5-flash",
    "gemini-1.5-pro":          "gemini-1.5-flash",
}
DOWNGRADE_SAVINGS_FACTOR = 0.25   # rough 75% cost reduction on downgrade


@dataclass
class FeatureMargin:
    feature_tag: str
    activations: int
    total_cost_usd: float
    cost_per_activation: float
    revenue_usd: float
    gross_margin_pct: float | None
    margin_status: str              # negative | warning | acceptable | healthy
    top_model: str | None
    savings_potential_usd: float    # estimated monthly savings from optimisation
    customer_breakdown: list[dict[str, Any]]


def _classify_margin(pct: float | None) -> str:
    if pct is None or pct < 0:
        return "negative"
    if pct < MARGIN_THRESHOLDS["warning"]:
        return "warning"
    if pct < MARGIN_THRESHOLDS["acceptable"]:
        return "warning"
    if pct < MARGIN_THRESHOLDS["healthy"]:
        return "acceptable"
    return "healthy"


def _estimate_savings(total_cost: float, top_model: str | None) -> float:
    """Rough monthly savings from switching to a cheaper model."""
    if top_model and top_model in MODEL_CHEAPER:
        return round(total_cost * DOWNGRADE_SAVINGS_FACTOR, 4)
    return 0.0


async def get_feature_margins(
    tenant_id: str,
    month: str | None = None,
) -> list[FeatureMargin]:
    """
    Return per-feature margin data for the given month, sorted worst first.
    """
    target = _parse_month(month)
    db = await get_db()

    cost_rows: list[dict] = (
        await db.table("ci_inference_logs")
        .select("feature_tag,model,count(*),sum(cost_usd),avg(cost_usd)")
        .eq("tenant_id", tenant_id)
        .gte("created_at", f"{target}-01T00:00:00Z")
        .lt("created_at", _next_month(target))
        .not_.is_("feature_tag", "null")
        .execute()
    ).data or []

    # Supabase JS client doesn't support group-by directly — use RPC view instead
    # Fall back to manual aggregation from raw rows
    raw: list[dict] = (
        await db.table("ci_inference_logs")
        .select("feature_tag,model,cost_usd,customer_id")
        .eq("tenant_id", tenant_id)
        .gte("created_at", f"{target}-01T00:00:00Z")
        .lt("created_at", _next_month(target))
        .not_.is_("feature_tag", "null")
        .execute()
    ).data or []

    # Revenue by feature (approximated by splitting revenue across features
    # proportional to cost share — exact attribution requires feature tagging on Stripe)
    rev_rows: list[dict] = (
        await db.table("ci_monthly_revenue_summary")
        .select("revenue_usd,customer_id")
        .eq("tenant_id", tenant_id)
        .gte("month", f"{target}-01")
        .lt("month", _next_month(target))
        .execute()
    ).data or []

    total_revenue = sum(float(r.get("revenue_usd") or 0) for r in rev_rows)

    # Aggregate by feature
    feat_cost: dict[str, float] = {}
    feat_activations: dict[str, int] = {}
    feat_models: dict[str, dict[str, float]] = {}
    feat_customers: dict[str, dict[str, float]] = {}

    for row in raw:
        tag = row.get("feature_tag") or "untagged"
        cost = float(row.get("cost_usd") or 0)
        model = row.get("model") or "unknown"
        cid = row.get("customer_id") or "unattributed"

        feat_cost[tag] = feat_cost.get(tag, 0.0) + cost
        feat_activations[tag] = feat_activations.get(tag, 0) + 1
        feat_models.setdefault(tag, {})[model] = feat_models[tag].get(model, 0.0) + cost
        feat_customers.setdefault(tag, {})[cid] = feat_customers[tag].get(cid, 0.0) + cost

    total_cost = sum(feat_cost.values()) or 1.0

    results: list[FeatureMargin] = []
    for tag, cost in feat_cost.items():
        # Attribute revenue proportionally to cost share
        cost_share = cost / total_cost
        rev = total_revenue * cost_share
        margin_pct = round(((rev - cost) / rev) * 100, 2) if rev > 0 else None

        top_model = max(feat_models.get(tag, {}).items(), key=lambda x: x[1], default=(None, 0))[0]
        activations = feat_activations.get(tag, 0)

        customer_breakdown = [
            {"customer_id": cid, "cost_usd": round(c, 6)}
            for cid, c in sorted(feat_customers.get(tag, {}).items(), key=lambda x: -x[1])
        ]

        results.append(FeatureMargin(
            feature_tag=tag,
            activations=activations,
            total_cost_usd=round(cost, 6),
            cost_per_activation=round(cost / activations, 8) if activations else 0,
            revenue_usd=round(rev, 4),
            gross_margin_pct=margin_pct,
            margin_status=_classify_margin(margin_pct),
            top_model=top_model,
            savings_potential_usd=_estimate_savings(cost, top_model),
            customer_breakdown=customer_breakdown[:10],
        ))

    results.sort(key=lambda f: (f.gross_margin_pct is None, f.gross_margin_pct or 0))
    return results
