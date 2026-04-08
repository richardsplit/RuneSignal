"""
TrustLayer Python SDK — Main Client
"""

from __future__ import annotations
from typing import Optional

from .client import BaseClient
from .firewall import FirewallResource
from .agents import AgentsResource
from .exceptions import ExceptionsResource
from .provenance import ProvenanceResource


class TrustLayerClient:
    """
    Main entry point for the TrustLayer Python SDK.

    Args:
        api_key: Your TrustLayer API key (starts with 'tl_')
        base_url: API base URL (default: https://app.trustlayer.ai)
        agent_id: Default agent ID for all requests
        timeout: Request timeout in seconds (default: 10.0)
        max_retries: Number of retries on server errors (default: 2)

    Example:
        import asyncio
        from trustlayer import TrustLayerClient
        from trustlayer.types import EvaluateRequest

        async def main():
            tl = TrustLayerClient(api_key="tl_your_key", agent_id="agent-uuid")
            result = await tl.firewall.evaluate(EvaluateRequest(
                action="send_email",
                resource="email:outbound",
            ))
            print(result.verdict)

        asyncio.run(main())
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://app.trustlayer.ai",
        agent_id: Optional[str] = None,
        timeout: float = 10.0,
        max_retries: int = 2,
    ):
        self._base_client = BaseClient(
            api_key=api_key,
            base_url=base_url,
            agent_id=agent_id,
            timeout=timeout,
            max_retries=max_retries,
        )

        self.firewall = FirewallResource(self._base_client)
        self.agents = AgentsResource(self._base_client)
        self.exceptions = ExceptionsResource(self._base_client)
        self.provenance = ProvenanceResource(self._base_client)
