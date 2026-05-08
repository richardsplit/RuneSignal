"""RuneSignal Python SDK — Base HTTP Client"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Literal, Optional

try:
    import httpx
except ImportError:
    raise ImportError(
        "The RuneSignal SDK requires 'httpx'. Install it with: pip install runesignal"
    )

from .types import RuneSignalError, AuthenticationError, RateLimitError

DEFAULT_BASE_URL = "https://app.runesignal.ai"
DEFAULT_TIMEOUT = 10.0
DEFAULT_MAX_RETRIES = 2


class BaseHTTPClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        agent_id: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ):
        if not api_key:
            raise ValueError("RuneSignal SDK: api_key is required")
        if not (api_key.startswith("rs_") or api_key.startswith("tl_")):
            raise ValueError('RuneSignal SDK: api_key must start with "rs_"')

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_agent_id = agent_id
        self.timeout = timeout
        self.max_retries = max_retries

    def _headers(self, agent_id: Optional[str] = None, idempotency_key: Optional[str] = None) -> Dict[str, str]:
        h: Dict[str, str] = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-SDK-Version": "1.0.0",
            "X-SDK-Language": "python",
        }
        effective_agent_id = agent_id or self.default_agent_id
        if effective_agent_id:
            h["X-Agent-Id"] = effective_agent_id
        if idempotency_key:
            h["Idempotency-Key"] = idempotency_key
        return h

    async def request(
        self,
        method: Literal["GET", "POST", "PATCH", "DELETE"],
        path: str,
        *,
        body: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
        query: Optional[Dict[str, str]] = None,
        idempotency_key: Optional[str] = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        headers = self._headers(agent_id, idempotency_key)
        last_error: Optional[Exception] = None

        async with httpx.AsyncClient(timeout=self.timeout) as http:
            for attempt in range(self.max_retries + 1):
                try:
                    resp = await http.request(
                        method, url, headers=headers, json=body, params=query
                    )
                    data: Any = resp.json() if resp.content else {}

                    if resp.status_code == 401:
                        raise AuthenticationError(data.get("message") or data.get("error") or "Invalid API key")
                    if resp.status_code == 429:
                        raise RateLimitError(data.get("message") or data.get("error") or "Rate limit exceeded")
                    if resp.is_client_error:
                        raise RuneSignalError(
                            data.get("error") or data.get("message") or f"Request failed: {resp.status_code}",
                            resp.status_code,
                        )
                    if resp.is_server_error:
                        last_error = RuneSignalError(
                            data.get("error") or f"Server error: {resp.status_code}",
                            resp.status_code,
                        )
                        if attempt < self.max_retries:
                            await asyncio.sleep(2 ** attempt * 0.5)
                            continue
                        raise last_error

                    return data

                except (RuneSignalError, AuthenticationError, RateLimitError):
                    raise
                except httpx.TimeoutException:
                    last_error = RuneSignalError("Request timed out", 408, "TIMEOUT")
                    if attempt < self.max_retries:
                        await asyncio.sleep(2 ** attempt * 0.5)
                except httpx.RequestError as e:
                    last_error = RuneSignalError(str(e), 0, "NETWORK_ERROR")
                    if attempt < self.max_retries:
                        await asyncio.sleep(2 ** attempt * 0.5)

        raise last_error or RuneSignalError("Request failed after retries", 500)
