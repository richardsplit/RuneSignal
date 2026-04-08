"""TrustLayer Python SDK — Provenance resource."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from .client import BaseClient
from .types import ProvenanceCertificate, CertifyRequest


class ProvenanceResource:
    def __init__(self, client: BaseClient) -> None:
        self._client = client

    async def certify(
        self,
        request: CertifyRequest,
        *,
        agent_id: Optional[str] = None,
    ) -> ProvenanceCertificate:
        """Create an Ed25519-signed provenance certificate."""
        payload: Dict[str, Any] = {
            "provider": request.provider,
            "model": request.model,
            "prompt": request.prompt,
            "completion": request.completion,
        }
        if request.metadata is not None:
            payload["metadata"] = request.metadata

        data = await self._client.request(
            "POST",
            "/api/v1/provenance/certify",
            body=payload,
            agent_id=agent_id,
        )
        return _map_cert(data)

    async def verify(self, certificate_id: str) -> Dict[str, Any]:
        """Retrieve and verify a provenance certificate.

        Returns the certificate plus ``verified: bool`` and optional ``verification_error``.
        """
        return await self._client.request("GET", f"/api/v1/provenance/{certificate_id}")

    async def list(
        self,
        agent_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[ProvenanceCertificate]:
        """List provenance certificates for the tenant."""
        params: Dict[str, Any] = {"limit": limit}
        if agent_id is not None:
            params["agent_id"] = agent_id

        data = await self._client.request("GET", "/api/v1/provenance", query=params)
        certs = data.get("data", data) if isinstance(data, dict) else data
        if isinstance(certs, list):
            return [_map_cert(c) for c in certs]
        return []


def _map_cert(data: Dict[str, Any]) -> ProvenanceCertificate:
    return ProvenanceCertificate(
        id=data.get("id", ""),
        tenant_id=data.get("tenant_id", ""),
        provider=data.get("provider", ""),
        model=data.get("model", ""),
        input_hash=data.get("input_hash", ""),
        output_hash=data.get("output_hash", ""),
        signature=data.get("signature", ""),
        created_at=data.get("created_at", ""),
        agent_id=data.get("agent_id"),
    )
