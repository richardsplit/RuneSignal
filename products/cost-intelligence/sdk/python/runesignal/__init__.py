"""
runesignal — AI Cost Intelligence SDK
======================================

Usage (decorator):

    import runesignal

    runesignal.configure(api_key="rs_live_...")

    @runesignal.track(customer_id="cust_123", feature_tag="summarize", endpoint_id="POST /summarize")
    async def summarize(text: str):
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": text}],
        )
        return response.choices[0].message.content

Usage (proxy base_url — no decorator needed):

    import runesignal
    runesignal.configure(api_key="rs_live_...")
    client = openai.AsyncOpenAI(base_url=runesignal.proxy_url())

"""

from __future__ import annotations

import asyncio
import functools
import inspect
import logging
import os
import time
from typing import Any, Callable, TypeVar

from ._cost_table import calculate_cost
from ._transport import fire_and_forget, ship

__version__ = "0.1.0"
__all__ = ["configure", "track", "proxy_url", "calculate_cost"]

logger = logging.getLogger("runesignal")

# ── Global config ──────────────────────────────────────────────────────────────
_api_key: str | None = None
_base_url: str | None = None
_enabled: bool = True

F = TypeVar("F", bound=Callable[..., Any])


def configure(
    *,
    api_key: str | None = None,
    base_url: str | None = None,
    enabled: bool = True,
) -> None:
    """Call once at application startup."""
    global _api_key, _base_url, _enabled
    _api_key = api_key or os.getenv("RUNESIGNAL_API_KEY")
    _base_url = base_url or os.getenv("RUNESIGNAL_BASE_URL")
    _enabled = enabled


def proxy_url() -> str:
    """
    Return the RuneSignal OpenAI-compatible proxy base URL.
    Set as openai.AsyncOpenAI(base_url=runesignal.proxy_url()).
    """
    base = (_base_url or "https://api.runesignal.com").rstrip("/")
    return f"{base}/proxy/openai/v1"


# ── Payload builder ────────────────────────────────────────────────────────────

def _build_payload(
    response: Any,
    *,
    customer_id: str | None,
    feature_tag: str | None,
    endpoint_id: str | None,
    latency_ms: int,
    extra_meta: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """
    Extract token counts + cost from an OpenAI-style response object.
    Returns None if we can't read usage (e.g., streaming response not yet consumed).
    """
    try:
        usage = getattr(response, "usage", None)
        if usage is None:
            return None

        model: str = getattr(response, "model", "") or ""
        input_tokens: int = getattr(usage, "prompt_tokens", 0) or 0
        output_tokens: int = getattr(usage, "completion_tokens", 0) or 0
        cached_tokens: int = 0
        reasoning_tokens: int = 0

        # OpenAI prompt_tokens_details / completion_tokens_details
        ptd = getattr(usage, "prompt_tokens_details", None)
        ctd = getattr(usage, "completion_tokens_details", None)
        if ptd:
            cached_tokens = getattr(ptd, "cached_tokens", 0) or 0
        if ctd:
            reasoning_tokens = getattr(ctd, "reasoning_tokens", 0) or 0

        # Anthropic uses usage.input_tokens / usage.output_tokens
        if input_tokens == 0:
            input_tokens = getattr(usage, "input_tokens", 0) or 0
        if output_tokens == 0:
            output_tokens = getattr(usage, "output_tokens", 0) or 0

        cost = calculate_cost(
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=cached_tokens,
            reasoning_tokens=reasoning_tokens,
        )

        return {
            "customer_id": customer_id,
            "feature_tag": feature_tag,
            "endpoint_id": endpoint_id,
            "model": model,
            "provider": _infer_provider(model),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cached_tokens": cached_tokens,
            "reasoning_tokens": reasoning_tokens,
            "cost_usd": cost,
            "latency_ms": latency_ms,
            "session_id": (extra_meta or {}).get("session_id"),
            "request_id": getattr(response, "id", None),
            "metadata": extra_meta,
        }
    except Exception as exc:  # noqa: BLE001
        logger.debug("runesignal: failed to build payload: %s", exc)
        return None


def _infer_provider(model: str) -> str:
    m = model.lower()
    if m.startswith("gpt") or m.startswith("o1") or m.startswith("o3") or m.startswith("o4"):
        return "openai"
    if m.startswith("claude"):
        return "anthropic"
    if m.startswith("gemini"):
        return "gemini"
    return "other"


# ── @track decorator ───────────────────────────────────────────────────────────

def track(
    func: F | None = None,
    *,
    customer_id: str | None = None,
    feature_tag: str | None = None,
    endpoint_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> F | Callable[[F], F]:
    """
    Decorator that measures an async LLM call and ships a cost log.

    Can be used with or without arguments:

        @runesignal.track
        async def my_fn(...): ...

        @runesignal.track(customer_id="abc", feature_tag="chat")
        async def my_fn(...): ...
    """

    def decorator(fn: F) -> F:
        if not inspect.iscoroutinefunction(fn):
            raise TypeError(f"runesignal.track only supports async functions, got {fn!r}")

        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Resolve runtime customer_id from kwargs if not set at decoration time
            _cid = customer_id or kwargs.get("customer_id") or kwargs.get("_rs_customer_id")
            _ftag = feature_tag
            _eid = endpoint_id or fn.__name__

            t0 = time.monotonic()
            try:
                result = await fn(*args, **kwargs)
            except Exception:
                raise  # never swallow the caller's exception

            latency = int((time.monotonic() - t0) * 1000)

            # Ship log asynchronously — never block
            key = _api_key or os.getenv("RUNESIGNAL_API_KEY")
            if key and _enabled and result is not None:
                payload = _build_payload(
                    result,
                    customer_id=_cid,
                    feature_tag=_ftag,
                    endpoint_id=_eid,
                    latency_ms=latency,
                    extra_meta=metadata,
                )
                if payload:
                    fire_and_forget(ship(payload, api_key=key, base_url=_base_url))

            return result

        return wrapper  # type: ignore[return-value]

    if func is not None:
        # Used as @runesignal.track (no parentheses)
        return decorator(func)
    return decorator
