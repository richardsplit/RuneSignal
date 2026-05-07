"""
GET    /v1/policies        — list budget policies
POST   /v1/policies        — create policy
PUT    /v1/policies/{id}   — update policy
DELETE /v1/policies/{id}   — delete policy
GET    /v1/policies/consumption — current budget consumption vs limits
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from ...middleware.auth import TenantDep
from ...db import get_db
from ...services.enforcement_engine import create_policy, evaluate_policy

router = APIRouter(prefix="/policies", tags=["policies"])

ScopeType = Literal["global", "customer", "endpoint"]
Action    = Literal["allow", "downgrade_model", "terminate"]


class PolicyCreate(BaseModel):
    scope_type: ScopeType
    scope_value: str = ""
    daily_limit_usd: float | None = None
    monthly_limit_usd: float | None = None
    soft_action: Action = "downgrade_model"
    hard_action: Action = "terminate"
    fallback_model: str | None = None


class PolicyUpdate(PolicyCreate):
    is_active: bool = True


@router.get("")
async def list_policies(tenant: TenantDep):
    db = await get_db()
    rows = (
        await db.table("ci_budget_policies")
        .select("*")
        .eq("tenant_id", tenant["id"])
        .order("created_at", desc=True)
        .execute()
    ).data or []
    return {"policies": rows, "count": len(rows)}


@router.post("", status_code=201)
async def create_budget_policy(body: PolicyCreate, tenant: TenantDep):
    row = await create_policy(
        tenant_id=tenant["id"],
        scope_type=body.scope_type,
        scope_value=body.scope_value,
        daily_limit_usd=body.daily_limit_usd,
        monthly_limit_usd=body.monthly_limit_usd,
        soft_action=body.soft_action,
        hard_action=body.hard_action,
        fallback_model=body.fallback_model,
    )
    return {"ok": True, "policy": row}


@router.put("/{policy_id}")
async def update_policy(policy_id: str, body: PolicyUpdate, tenant: TenantDep):
    db = await get_db()
    result = (
        await db.table("ci_budget_policies")
        .update({
            "scope_type": body.scope_type,
            "scope_value": body.scope_value,
            "daily_limit_usd": body.daily_limit_usd,
            "monthly_limit_usd": body.monthly_limit_usd,
            "soft_action": body.soft_action,
            "hard_action": body.hard_action,
            "fallback_model": body.fallback_model,
            "is_active": body.is_active,
        })
        .eq("id", policy_id)
        .eq("tenant_id", tenant["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"ok": True, "policy": result.data[0]}


@router.delete("/{policy_id}")
async def delete_policy(policy_id: str, tenant: TenantDep):
    db = await get_db()
    await (
        db.table("ci_budget_policies")
        .update({"is_active": False})
        .eq("id", policy_id)
        .eq("tenant_id", tenant["id"])
        .execute()
    )
    return {"ok": True}


@router.get("/consumption")
async def budget_consumption(tenant: TenantDep):
    """Return current spend vs limits for every active policy."""
    db = await get_db()
    policies = (
        await db.table("ci_budget_policies")
        .select("*")
        .eq("tenant_id", tenant["id"])
        .eq("is_active", True)
        .execute()
    ).data or []

    from ...services.enforcement_engine import _get_current_usage  # noqa: PLC0415
    result = []
    for p in policies:
        row = {"policy_id": p["id"], "scope_type": p["scope_type"], "scope_value": p["scope_value"]}
        for window, key in [("daily", "daily_limit_usd"), ("monthly", "monthly_limit_usd")]:
            limit = p.get(key)
            if limit:
                usage = await _get_current_usage(tenant["id"], p["scope_type"], p["scope_value"], window)
                pct = round(usage / float(limit) * 100, 1)
                row[window] = {"usage_usd": round(usage, 4), "limit_usd": float(limit), "pct_used": pct}
        result.append(row)

    return {"consumption": result}
