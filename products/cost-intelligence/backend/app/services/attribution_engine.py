"""
Attribution Engine — joins AI inference cost with Stripe revenue
to produce per-customer gross margin data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from ..db import get_db
from ..models.schemas import CustomerMargin, MarginSummary

logger = logging.getLogger(__name__)

DANGEROUS_MARGIN_THRESHOLD = 30.0   # gross_margin_pct < 30% is "dangerous"
CRITICAL_MARGIN_THRESHOLD  = 0.0    # gross_margin_pct < 0% is "critical"


async def get_customer_margins(
    tenant_id: str,
    month: str | None = None,   # "YYYY-MM" format; defaults to current month
) -> MarginSummary:
    """
    Return all customers with revenue, AI cost, and gross margin for the given month.
    Results are sorted gross_margin_pct ascending (worst first).
    """
    target_month = _parse_month(month)
    db = await get_db()

    # Query the ci_customer_margin view
    rows: list[dict[str, Any]] = (
        await db.table("ci_customer_margin")
        .select("*")
        .eq("tenant_id", tenant_id)
        .gte("month", f"{target_month}-01")
        .lt("month", _next_month(target_month))
        .execute()
    ).data or []

    # Fetch display names for customers
    name_map = await _get_display_names(tenant_id)

    # Compute totals for share calculations
    total_revenue = sum(float(r.get("revenue_usd") or 0) for r in rows)
    total_cost    = sum(float(r.get("ai_cost_usd") or 0) for r in rows)

    customers: list[CustomerMargin] = []
    for row in rows:
        cid         = row.get("customer_id") or "unattributed"
        revenue     = float(row.get("revenue_usd") or 0)
        ai_cost     = float(row.get("ai_cost_usd") or 0)
        margin_pct  = float(row["gross_margin_pct"]) if row.get("gross_margin_pct") is not None else None

        is_dangerous = (
            margin_pct is not None and margin_pct < DANGEROUS_MARGIN_THRESHOLD
        ) or (
            revenue == 0 and ai_cost > 0
        )

        customers.append(CustomerMargin(
            customer_id=cid,
            display_name=name_map.get(cid),
            revenue_usd=revenue,
            ai_cost_usd=ai_cost,
            gross_margin_pct=margin_pct,
            request_count=int(row.get("request_count") or 0),
            plan_tier=row.get("plan_tier"),
            is_dangerous=is_dangerous,
            revenue_share_pct=round((revenue / total_revenue * 100), 2) if total_revenue > 0 else None,
            ai_cost_share_pct=round((ai_cost / total_cost * 100), 2)    if total_cost > 0    else None,
        ))

    # Sort worst margin first
    customers.sort(key=lambda c: (c.gross_margin_pct is None, c.gross_margin_pct or 0))

    overall_margin = (
        round(((total_revenue - total_cost) / total_revenue) * 100, 2)
        if total_revenue > 0 else None
    )

    return MarginSummary(
        month=target_month,
        customers=customers,
        total_revenue_usd=total_revenue,
        total_ai_cost_usd=total_cost,
        overall_margin_pct=overall_margin,
    )


async def get_first_dangerous_customer(
    tenant_id: str,
    month: str | None = None,
) -> CustomerMargin | None:
    """
    Return the single worst offender: highest AI cost relative to revenue.
    Used for the 24h insight email.
    """
    summary = await get_customer_margins(tenant_id, month)
    dangerous = [c for c in summary.customers if c.is_dangerous and c.ai_cost_usd > 0]
    if not dangerous:
        # Fall back to worst margin even if not technically "dangerous"
        all_with_cost = [c for c in summary.customers if c.ai_cost_usd > 0]
        return all_with_cost[0] if all_with_cost else None
    return dangerous[0]


def format_dangerous_customer_insight(customer: CustomerMargin) -> str:
    """
    Return the one-sentence hook insight shown in the email.
    Example: "Customer acme-corp contributes 12% of your MRR ($480/month) but
              consumes 41% of your AI inference spend ($1,640/month).
              Their effective gross margin: -241%."
    """
    name = customer.display_name or customer.customer_id
    rev_share = f"{customer.revenue_share_pct:.0f}%" if customer.revenue_share_pct is not None else "?"
    cost_share = f"{customer.ai_cost_share_pct:.0f}%" if customer.ai_cost_share_pct is not None else "?"
    margin = (
        f"{customer.gross_margin_pct:.0f}%"
        if customer.gross_margin_pct is not None
        else "N/A (no revenue)"
    )
    return (
        f'Customer "{name}" contributes {rev_share} of your MRR '
        f"(${customer.revenue_usd:,.0f}/month) but consumes {cost_share} of your "
        f"AI inference spend (${customer.ai_cost_usd:,.2f}/month). "
        f"Their effective gross margin: {margin}."
    )


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_display_names(tenant_id: str) -> dict[str, str]:
    db = await get_db()
    rows = (
        await db.table("ci_customer_id_mappings")
        .select("internal_customer_id,display_name")
        .eq("tenant_id", tenant_id)
        .execute()
    ).data or []
    return {r["internal_customer_id"]: r["display_name"] for r in rows if r.get("display_name")}


def _parse_month(month: str | None) -> str:
    if month:
        # Accept "YYYY-MM" or "YYYY-MM-DD"
        return month[:7]
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _next_month(month: str) -> str:
    """'2024-03' → '2024-04-01'"""
    y, m = int(month[:4]), int(month[5:7])
    if m == 12:
        return f"{y + 1}-01-01"
    return f"{y}-{m + 1:02d}-01"
