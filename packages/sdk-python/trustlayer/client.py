"""
TrustLayer Python SDK — Base HTTP Client
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, Optional, Literal

try:
    import httpx
except ImportError:
    raise ImportError(
        "The TrustLayer SDK requires 'httpx'. Install it with: pip install trustlayer[async] "
        "or pip install httpx"
    )

from .types import TrustLayerError, AuthenticationError, RateLimitError

DEFAULT_BASE_URL = "https://app.trustlayer.ai"
DEFAULT_TIMEOUT = 10.0
DEFAULT_MAX_RETRIES = 2


class BaseClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        agent_id: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ):
        if not api_key:
            raise ValueError("TrustLayer SDK: api_key is required")
        if not api_key.startswith("tl_"):
            raise ValueError('TrustLayer SDK: api_key must start with "tl_"')

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_agent_id = agent_id
        self.timeout = timeout
        self.max_retries = max_retries

        self._headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-SDK-Version": "1.0.0",
            "X-SDK-Language": "python",
        }

    def _get_headers(self, agent_id: Optional[str] = None) -> Dict[str, str]:
        headers = dict(self._headers)
        effective_agent_id = agent_id or self.default_agent_id
        if effective_agent_id:
            headers["X-Agent-Id"] = effective_agent_id
        return headers

    async def request(
        self,
        method: Literal["GET", "POST", "PATCH", "DELETE"],
        path: str,
        *,
        body: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
        query: Optional[Dict[str, str]] = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        headers = self._get_headers(agent_id)
        last_error: Optional[Exception] = None

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    response = await client.request(
                        method,
                        url,
                        headers=headers,
                        json=body,
                        params=query,
                    )

                    data = response.json() if response.content else {}

                    if response.status_code == 401:
                        raise AuthenticationError(
                            data.get("message") or data.get("error") or "Invalid API key"
                        )
                    if response.status_code == 429:
                        raise RateLimitError(
                            data.get("message") or data.get("error") or "Rate limit exceeded"
                        )
                    if response.is_client_error:
                        raise TrustLayerError(
                            data.get("error") or data.get("message") or f"Request failed: {response.status_code}",
                            response.status_code,
                        )
                    if response.is_server_error:
                        last_error = TrustLayerError(
                            data.get("error") or f"Server error: {response.status_code}",
                            response.status_code,
                        )
                        if attempt < self.max_retries:
                            await asyncio.sleep(2 ** attempt * 0.5)
                            continue
                        raise last_error

                    return data

                except (TrustLayerError, AuthenticationError, RateLimitError):
                    raise
                except httpx.TimeoutException:
                    last_error = TrustLayerError("Request timed out", 408, "TIMEOUT")
                    if attempt < self.max_retries:
                        await asyncio.sleep(2 ** attempt * 0.5)
                except httpx.RequestError as e:
                    last_error = TrustLayerError(str(e), 0, "NETWORK_ERROR")
                    if attempt < self.max_retries:
                        await asyncio.sleep(2 ** attempt * 0.5)

        raise last_error or TrustLayerError("Request failed after retries", 500)
