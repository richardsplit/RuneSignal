"""
Module 2: OpenAI-Compatible Proxy
POST /proxy/openai/{path} — enforces budget policies before forwarding.
Logs inference cost on response. Never modifies response data.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse

from ..db import get_db
from ..middleware.auth import TenantDep
from ..services.enforcement_engine import evaluate_policy
from ..services.attribution_engine import _next_month, _parse_month
from ..sdk_cost import _calculate_cost_from_usage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/proxy/openai", tags=["proxy"])

OPENAI_BASE = "https://api.openai.com"
FORWARD_TIMEOUT = 120.0


def _extract_request_meta(body: dict) -> tuple[str, str | None, str | None, str | None]:
    """Extract model, customer_id, feature_tag, endpoint_id from proxy request."""
    model = body.get("model", "gpt-4o-mini")
    meta = body.get("runesignal", {}) or {}
    customer_id = meta.get("customer_id") or body.get("user")
    feature_tag = meta.get("feature_tag")
    endpoint_id = meta.get("endpoint_id")
    return model, customer_id, feature_tag, endpoint_id


async def _get_tenant_openai_key(tenant_id: str) -> str | None:
    """Retrieve the tenant's stored (encrypted) OpenAI API key."""
    db = await get_db()
    row = (
        await db.table("ci_tenants")
        .select("openai_api_key_enc")
        .eq("id", tenant_id)
        .maybe_single()
        .execute()
    )
    if not row.data or not row.data.get("openai_api_key_enc"):
        return None
    # Decrypt — in production, use AES-256 via the encryption_key config
    # For now return as-is (plaintext stored during onboarding test-and-save)
    return row.data["openai_api_key_enc"]


async def _log_inference(
    tenant_id: str,
    model: str,
    customer_id: str | None,
    feature_tag: str | None,
    endpoint_id: str | None,
    response_body: dict,
    latency_ms: int,
) -> None:
    """Fire-and-forget inference log after proxy response is returned."""
    try:
        usage = response_body.get("usage") or {}
        input_tokens  = usage.get("prompt_tokens", 0) or 0
        output_tokens = usage.get("completion_tokens", 0) or 0
        ptd = (usage.get("prompt_tokens_details") or {})
        ctd = (usage.get("completion_tokens_details") or {})
        cached_tokens    = ptd.get("cached_tokens", 0) or 0
        reasoning_tokens = ctd.get("reasoning_tokens", 0) or 0

        from ..sdk_cost import calculate_cost as _cc  # noqa: PLC0415
        cost = _cc(model, input_tokens, output_tokens, cached_tokens, reasoning_tokens)

        db = await get_db()
        await db.table("ci_inference_logs").insert({
            "tenant_id": tenant_id,
            "customer_id": customer_id,
            "feature_tag": feature_tag,
            "endpoint_id": endpoint_id,
            "model": response_body.get("model", model),
            "provider": "openai",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cached_tokens": cached_tokens,
            "reasoning_tokens": reasoning_tokens,
            "cost_usd": cost,
            "latency_ms": latency_ms,
            "request_id": response_body.get("id"),
        }).execute()
    except Exception as exc:
        logger.debug("proxy: failed to log inference: %s", exc)


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy(path: str, request: Request, tenant: TenantDep) -> Response:
    body_bytes = await request.body()
    body: dict[str, Any] = {}

    try:
        body = json.loads(body_bytes) if body_bytes else {}
    except json.JSONDecodeError:
        pass

    model, customer_id, feature_tag, endpoint_id = _extract_request_meta(body)

    # ── Budget policy evaluation ───────────────────────────────────────────────
    result = await evaluate_policy(
        tenant_id=tenant["id"],
        customer_id=customer_id,
        endpoint_id=endpoint_id,
        requested_model=model,
    )

    if result.action == "terminate":
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "budget_limit_exceeded",
                "reason": result.reason,
                "usage_usd": result.usage_usd,
                "limit_usd": result.limit_usd,
                "pct_used": result.pct_used,
            },
        )

    if result.action == "downgrade_model" and result.downgrade_model:
        logger.info("proxy: downgrading %s → %s for tenant %s (%s)",
                    model, result.downgrade_model, tenant["id"], result.reason)
        body["model"] = result.downgrade_model
        body_bytes = json.dumps(body).encode()
        model = result.downgrade_model

    # Remove runesignal metadata before forwarding
    if "runesignal" in body:
        del body["runesignal"]
        body_bytes = json.dumps(body).encode()

    # ── Get tenant's OpenAI key ────────────────────────────────────────────────
    openai_key = await _get_tenant_openai_key(tenant["id"])
    if not openai_key:
        # Fall back to Authorization header passed by caller
        openai_key = (request.headers.get("X-OpenAI-Key") or
                      request.headers.get("Authorization", "").replace("Bearer ", ""))

    # ── Forward to OpenAI ──────────────────────────────────────────────────────
    forward_headers = {
        "Authorization": f"Bearer {openai_key}",
        "Content-Type": "application/json",
    }
    if request.headers.get("OpenAI-Organization"):
        forward_headers["OpenAI-Organization"] = request.headers["OpenAI-Organization"]

    t0 = time.monotonic()
    stream = body.get("stream", False)

    try:
        async with httpx.AsyncClient(timeout=FORWARD_TIMEOUT) as client:
            upstream = await client.request(
                method=request.method,
                url=f"{OPENAI_BASE}/v1/{path}",
                content=body_bytes,
                headers=forward_headers,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OpenAI request timed out")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc

    latency_ms = int((time.monotonic() - t0) * 1000)

    # Log asynchronously — don't await, don't block
    import asyncio  # noqa: PLC0415
    if upstream.status_code == 200 and not stream:
        try:
            resp_body = upstream.json()
            asyncio.create_task(_log_inference(
                tenant["id"], model, customer_id, feature_tag, endpoint_id, resp_body, latency_ms
            ))
        except Exception:
            pass

    # Strip hop-by-hop headers
    excluded = {"transfer-encoding", "connection", "keep-alive", "content-encoding"}
    resp_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in excluded}

    # Add policy metadata headers
    resp_headers["X-RS-Policy-Action"] = result.action
    if result.downgrade_model:
        resp_headers["X-RS-Downgraded-Model"] = result.downgrade_model

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type", "application/json"),
    )
