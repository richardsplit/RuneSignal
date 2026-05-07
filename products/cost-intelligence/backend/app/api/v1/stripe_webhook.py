"""
POST /webhooks/stripe

Validates Stripe signature, maps stripe_customer_id → internal customer_id,
inserts revenue events with idempotency.
"""

from __future__ import annotations

import logging

import stripe
from fastapi import APIRouter, HTTPException, Request, status

from ...config import get_settings
from ...db import get_db
from ...models.schemas import StripeWebhookResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["webhooks"])

HANDLED_EVENTS = {
    "charge.succeeded",
    "invoice.payment_succeeded",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
}


async def _resolve_customer_id(tenant_id: str, stripe_customer_id: str | None) -> str | None:
    """Map stripe_customer_id → internal_customer_id via ci_customer_id_mappings."""
    if not stripe_customer_id:
        return None
    db = await get_db()
    result = (
        await db.table("ci_customer_id_mappings")
        .select("internal_customer_id")
        .eq("tenant_id", tenant_id)
        .eq("stripe_customer_id", stripe_customer_id)
        .maybe_single()
        .execute()
    )
    return result.data["internal_customer_id"] if result.data else None


async def _find_tenant_by_stripe_id(stripe_customer_id: str | None) -> dict | None:
    """Find which of our tenants owns this Stripe customer (via stripe_connect_id or stripe_customer_id)."""
    if not stripe_customer_id:
        return None
    db = await get_db()
    result = (
        await db.table("ci_tenants")
        .select("id,email,stripe_connect_id")
        .eq("stripe_customer_id", stripe_customer_id)
        .maybe_single()
        .execute()
    )
    return result.data if result.data else None


async def _insert_revenue_event(event: stripe.Event, tenant_id: str) -> bool:
    """
    Insert a revenue event row. Returns False if already exists (idempotent).
    """
    obj = event.data.object  # type: ignore[attr-defined]
    stripe_customer_id: str | None = getattr(obj, "customer", None)

    internal_customer_id = await _resolve_customer_id(tenant_id, stripe_customer_id)

    amount_usd: float = 0.0
    period_start = None
    period_end = None
    plan_tier: str | None = None

    etype = event.type  # type: ignore[attr-defined]

    if etype in ("charge.succeeded", "invoice.payment_succeeded"):
        amount_usd = (getattr(obj, "amount", 0) or getattr(obj, "amount_paid", 0)) / 100.0
        period_start = _ts(getattr(obj, "period_start", None) or getattr(obj, "lines", {}) and None)
        period_end   = _ts(getattr(obj, "period_end", None))
        # Try to extract plan from invoice lines
        lines = getattr(obj, "lines", None)
        if lines and getattr(lines, "data", None):
            first_line = lines.data[0]
            plan_obj = getattr(first_line, "plan", None) or getattr(first_line, "price", None)
            plan_tier = getattr(plan_obj, "nickname", None) or getattr(plan_obj, "id", None)

    elif etype in ("customer.subscription.created", "customer.subscription.updated"):
        # MRR proxy: take monthly equivalent of the plan
        items = getattr(obj, "items", None)
        if items and getattr(items, "data", None):
            first_item = items.data[0]
            price = getattr(first_item, "price", None)
            if price:
                unit_amount = getattr(price, "unit_amount", 0) or 0
                interval = getattr(price, "recurring", {})
                iv = getattr(interval, "interval", "month") if interval else "month"
                count = getattr(interval, "interval_count", 1) if interval else 1
                # Normalise to monthly
                monthly_divisor = {"day": 30, "week": 4.33, "month": 1, "year": 1 / 12}.get(iv, 1)
                amount_usd = (unit_amount / 100.0) / (count * monthly_divisor)
                plan_tier = getattr(price, "nickname", None) or getattr(price, "id", None)

        status_val = getattr(obj, "status", "")
        period_start = _ts(getattr(obj, "current_period_start", None))
        period_end   = _ts(getattr(obj, "current_period_end", None))
        if status_val in ("canceled", "unpaid"):
            amount_usd = 0.0

    db = await get_db()
    try:
        await db.table("ci_revenue_events").insert({
            "tenant_id": tenant_id,
            "customer_id": internal_customer_id,
            "stripe_customer_id": stripe_customer_id,
            "stripe_event_id": event.id,  # type: ignore[attr-defined]
            "event_type": etype,
            "amount_usd": amount_usd,
            "plan_tier": plan_tier,
            "period_start": period_start,
            "period_end": period_end,
            "metadata": {"stripe_object_id": getattr(obj, "id", None)},
        }).execute()
        return True
    except Exception as exc:
        # Unique constraint on (tenant_id, stripe_event_id) — idempotent
        if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
            logger.debug("Stripe event %s already processed (idempotent)", event.id)  # type: ignore[attr-defined]
            return False
        raise


def _ts(unix: int | None) -> str | None:
    if not unix:
        return None
    from datetime import datetime, timezone
    return datetime.fromtimestamp(unix, tz=timezone.utc).isoformat()


@router.post("/webhooks/stripe", response_model=StripeWebhookResponse)
async def stripe_webhook(request: Request) -> StripeWebhookResponse:
    cfg = get_settings()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, cfg.stripe_webhook_secret)
    except stripe.error.SignatureVerificationError:  # type: ignore[attr-defined]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    etype: str = event.type  # type: ignore[attr-defined]
    if etype not in HANDLED_EVENTS:
        return StripeWebhookResponse(received=True, event_type=etype)

    obj = event.data.object  # type: ignore[attr-defined]
    stripe_customer_id: str | None = getattr(obj, "customer", None)
    tenant = await _find_tenant_by_stripe_id(stripe_customer_id)

    if tenant is None:
        logger.warning("No tenant found for Stripe customer %s (event %s)", stripe_customer_id, event.id)  # type: ignore[attr-defined]
        return StripeWebhookResponse(received=True, event_type=etype)

    await _insert_revenue_event(event, tenant["id"])
    logger.info("Processed Stripe event %s (%s) for tenant %s", event.id, etype, tenant["id"])  # type: ignore[attr-defined]
    return StripeWebhookResponse(received=True, event_type=etype)
