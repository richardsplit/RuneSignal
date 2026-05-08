"""RuneSignal Python SDK — Provenance (S3 Ledger) Resource"""
from __future__ import annotations

import hashlib
from typing import Any, Dict, List, Optional

from .http import BaseHTTPClient
from .types import CertifyRequest, ProvenanceCertificate


class ProvenanceResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def certify(
        self,
        request: CertifyRequest,
        agent_id: Optional[str] = None,
    ) -> ProvenanceCertificate:
        input_hash  = hashlib.sha256(request.prompt.encode()).hexdigest()
        output_hash = hashlib.sha256(request.completion.encode()).hexdigest()

        raw = await self._http.request(
            "POST",
            "/api/v1/provenance",
            body={
                "provider":    request.provider,
                "model":       request.model,
                "input_hash":  input_hash,
                "output_hash": output_hash,
                "completion_text": request.completion,
                "metadata":    request.metadata,
            },
            agent_id=agent_id,
        )
        return _map_cert(raw)

    async def verify(self, certificate_id: str) -> ProvenanceCertificate:
        raw = await self._http.request("GET", f"/api/v1/provenance/{certificate_id}")
        return _map_cert(raw)

    async def list(
        self,
        model: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[ProvenanceCertificate]:
        query: Dict[str, str] = {}
        if model: query["model"] = model
        if limit: query["limit"] = str(limit)
        raw_list = await self._http.request("GET", "/api/v1/provenance", query=query)
        return [_map_cert(r) for r in raw_list]


def _map_cert(raw: Dict[str, Any]) -> ProvenanceCertificate:
    return ProvenanceCertificate(
        id=raw.get("certificate_id") or raw.get("id", ""),
        tenant_id=raw.get("tenant_id", ""),
        provider=raw.get("provider", ""),
        model=raw.get("model", ""),
        input_hash=raw.get("input_hash", ""),
        output_hash=raw.get("output_hash", ""),
        signature=raw.get("signature", ""),
        created_at=raw.get("created_at", ""),
        agent_id=raw.get("agent_id"),
    )
