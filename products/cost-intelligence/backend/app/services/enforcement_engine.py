"""
Module 2: Budget Policy Enforcement Engine
Evaluates budget_policies in scope order: endpoint > customer > global (most specific wins).
Actions: allow | downgrade_model | terminate
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from ..db import get_db

logger = logging.getLogger(__name__)

Action = Literal["allow", "downgrade_model", "terminate"]
ScopeType = Literal["global", "customer", "endpoint"]

MODEL_DOWNGRADE: dict[str, str] = {
    "gpt-4o":            "gpt-4o-mini",
    "gpt-4.1":           "gpt-4o-mini",
    "claude-3-5-sonnet": "claude-3-5-haiku",
    "claude-3-opus":     "claude-3-5-haiku",
    "gemini-2.5-pro":    "gemini-2.0-flash",
    "gemini-1.5-pro":    "gemini-1.5-flash",
}


@dataclass
class PolicyEvalResult:
    action: Action
    policy_id: str | None
    reason: str
    downgrade_model: str | None = None
    usage_usd: float = 0.0
    limit_usd: float = 0.0
    pct_used: float = 0.0


async def _get_current_usage(
    tenant_id: str,
    scope_type: ScopeType,
    scope_value: str,
    window: str,          # "daily" | "monthly"
) -> float:
    """Sum cost_usd for the scope over the given window."""
    db = await get_db()
    now = datetime.now(timezone.utc)

    if window == "daily":
        since = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        since = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    query = (
        db.table("ci_inference_logs")
        .select("cost_usd")
        .eq("tenant_id", tenant_id)
        .gte("created_at", since.isoformat())
    )

    if scope_type == "customer":
        query = query.eq("customer_id", scope_value)
    elif scope_type == "endpoint":
        query = query.eq("endpoint_id", scope_value)

    rows = (await query.execute()).data or []
    return sum(float(r.get("cost_usd") or 0) for r in rows)


async def evaluate_policy(
    tenant_id: str,
    customer_id: str | None,
    endpoint_id: str | None,
    requested_model: str,
) -> PolicyEvalResult:
    """
    Evaluate budget policies in specificity order.
    Returns the most restrictive applicable action.
    """
    db = await get_db()

    # Fetch all active policies for this tenant
    policies: list[dict[str, Any]] = (
        await db.table("ci_budget_policies")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("is_active", True)
        .execute()
    ).data or []

    # Order: endpoint > customer > global (most specific first)
    SCOPE_RANK: dict[str, int] = {"endpoint": 3, "customer": 2, "global": 1}
    policies.sort(key=lambda p: SCOPE_RANK.get(p.get("scope_type", "global"), 0), reverse=True)

    for policy in policies:
        scope_type: ScopeType = policy.get("scope_type", "global")
        scope_value: str = policy.get("scope_value", "")

        # Check if policy applies to this request
        if scope_type == "customer" and scope_value != (customer_id or ""):
            continue
        if scope_type == "endpoint" and scope_value != (endpoint_id or ""):
            continue

        # Evaluate daily and monthly limits
        for window_key, limit_key in [("daily", "daily_limit_usd"), ("monthly", "monthly_limit_usd")]:
            limit = policy.get(limit_key)
            if not limit:
                continue

            usage = await _get_current_usage(tenant_id, scope_type, scope_value, window_key)
            pct = usage / float(limit) if float(limit) > 0 else 0.0

            if pct >= 1.0:
                # Hard limit — terminate or fallback
                hard_action: Action = policy.get("hard_action") or "terminate"
                fallback = policy.get("fallback_model")
                if hard_action == "downgrade_model" and fallback:
                    return PolicyEvalResult(
                        action="downgrade_model",
                        policy_id=policy["id"],
                        reason=f"{window_key} hard limit reached ({pct*100:.0f}% of ${limit})",
                        downgrade_model=fallback or MODEL_DOWNGRADE.get(requested_model),
                        usage_usd=usage,
                        limit_usd=float(limit),
                        pct_used=round(pct * 100, 1),
                    )
                return PolicyEvalResult(
                    action="terminate",
                    policy_id=policy["id"],
                    reason=f"{window_key} hard limit reached ({pct*100:.0f}% of ${limit})",
                    usage_usd=usage,
                    limit_usd=float(limit),
                    pct_used=round(pct * 100, 1),
                )

            if pct >= 0.80:
                # Soft limit — downgrade or alert
                soft_action: Action = policy.get("soft_action") or "downgrade_model"
                if soft_action == "downgrade_model":
                    downgrade = policy.get("fallback_model") or MODEL_DOWNGRADE.get(requested_model)
                    if downgrade:
                        return PolicyEvalResult(
                            action="downgrade_model",
                            policy_id=policy["id"],
                            reason=f"{window_key} soft limit at 80% (${usage:.4f}/${limit})",
                            downgrade_model=downgrade,
                            usage_usd=usage,
                            limit_usd=float(limit),
                            pct_used=round(pct * 100, 1),
                        )

    return PolicyEvalResult(action="allow", policy_id=None, reason="no policy triggered")


async def create_policy(
    tenant_id: str,
    scope_type: ScopeType,
    scope_value: str,
    daily_limit_usd: float | None = None,
    monthly_limit_usd: float | None = None,
    soft_action: Action = "downgrade_model",
    hard_action: Action = "terminate",
    fallback_model: str | None = None,
) -> dict[str, Any]:
    db = await get_db()
    row = {
        "tenant_id": tenant_id,
        "scope_type": scope_type,
        "scope_value": scope_value,
        "daily_limit_usd": daily_limit_usd,
        "monthly_limit_usd": monthly_limit_usd,
        "soft_action": soft_action,
        "hard_action": hard_action,
        "fallback_model": fallback_model,
        "is_active": True,
    }
    result = await db.table("ci_budget_policies").insert(row).execute()
    return result.data[0] if result.data else row
