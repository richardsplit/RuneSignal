"""
Fire-and-forget HTTP transport for the RuneSignal SDK.
Never raises — all errors are swallowed so customer code is never affected.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False

logger = logging.getLogger("runesignal")

_DEFAULT_INGEST_URL = "https://api.runesignal.com/v1/ingest/log"
_TIMEOUT = 4.0  # seconds — must not block caller meaningfully


def _get_client() -> "httpx.AsyncClient | None":
    if not _HTTPX_AVAILABLE:
        return None
    return httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT)


_DEFAULT_TIMEOUT = httpx.Timeout(_TIMEOUT) if _HTTPX_AVAILABLE else None  # type: ignore[assignment]
_shared_client: "httpx.AsyncClient | None" = None


def _client() -> "httpx.AsyncClient | None":
    global _shared_client
    if not _HTTPX_AVAILABLE:
        return None
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT)
    return _shared_client


async def ship(payload: dict[str, Any], api_key: str, base_url: str | None = None) -> None:
    """Send a single log payload. Fire-and-forget — never raises."""
    if not _HTTPX_AVAILABLE:
        logger.debug("runesignal: httpx not installed, skipping log ship")
        return

    url = (base_url or os.getenv("RUNESIGNAL_BASE_URL", _DEFAULT_INGEST_URL))
    client = _client()
    if client is None:
        return

    try:
        resp = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-SDK-Version": "0.1.0",
            },
        )
        if resp.status_code >= 400:
            logger.debug("runesignal: ingest returned %d", resp.status_code)
    except Exception as exc:  # noqa: BLE001
        logger.debug("runesignal: failed to ship log: %s", exc)


async def ship_batch(payloads: list[dict[str, Any]], api_key: str, base_url: str | None = None) -> None:
    """Batch ship. Fire-and-forget — never raises."""
    if not _HTTPX_AVAILABLE or not payloads:
        return

    url = (base_url or os.getenv("RUNESIGNAL_BASE_URL", "")).rstrip("/")
    batch_url = url.replace("/log", "/batch") if url.endswith("/log") else f"{url}/batch"
    client = _client()
    if client is None:
        return

    try:
        resp = await client.post(
            batch_url,
            json={"logs": payloads},
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-SDK-Version": "0.1.0",
            },
        )
        if resp.status_code >= 400:
            logger.debug("runesignal: batch ingest returned %d", resp.status_code)
    except Exception as exc:  # noqa: BLE001
        logger.debug("runesignal: failed to ship batch: %s", exc)


def fire_and_forget(coro: "asyncio.coroutines.Coroutine[Any, Any, Any]") -> None:
    """Schedule a coroutine without awaiting it. Works in async and sync contexts."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        # No running event loop — run in a new thread-local loop
        try:
            asyncio.run(coro)
        except Exception:  # noqa: BLE001
            pass
