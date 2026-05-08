"""RuneSignal Python SDK — Evidence Bundles"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

from .http import BaseHTTPClient

Regulation = Literal["eu_ai_act", "iso_42001", "nist_ai_rmf", "hipaa", "sox", "gdpr", "pci_dss"]
EvidenceFormat = Literal["json", "pdf", "zip"]


@dataclass
class EvidenceGap:
    article: str
    description: str
    severity: str
    remediation_hint: str


@dataclass
class ArticleCoverage:
    article: str
    title: str
    covered: bool
    coverage_pct: float
    evidence_count: int


@dataclass
class EvidencePreview:
    regulation: str
    overall_score: float
    article_coverage: List[ArticleCoverage]
    gaps: List[EvidenceGap]
    period_from: str
    period_to: str
    agent_count: int
    total_events: int


@dataclass
class EvidenceBundle:
    id: str
    tenant_id: str
    regulation: str
    status: str
    overall_score: float
    article_count: int
    evidence_item_count: int
    created_at: str
    signature_hash: Optional[str] = None
    download_url: Optional[str] = None
    expires_at: Optional[str] = None


class EvidenceResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def preview(
        self,
        regulation: str,
        date_from: str,
        date_to: str,
        agent_ids: Optional[List[str]] = None,
    ) -> EvidencePreview:
        query: Dict[str, str] = {
            "regulation": regulation,
            "date_from": date_from,
            "date_to": date_to,
        }
        if agent_ids:
            query["agent_ids"] = ",".join(agent_ids)

        raw = await self._http.request("GET", "/api/v1/compliance/evidence-preview", query=query)
        return EvidencePreview(
            regulation=raw["regulation"],
            overall_score=raw["overall_score"],
            article_coverage=[
                ArticleCoverage(
                    article=a["article"],
                    title=a["title"],
                    covered=a["covered"],
                    coverage_pct=a["coverage_pct"],
                    evidence_count=a["evidence_count"],
                )
                for a in raw.get("article_coverage", [])
            ],
            gaps=[
                EvidenceGap(
                    article=g["article"],
                    description=g["description"],
                    severity=g["severity"],
                    remediation_hint=g["remediation_hint"],
                )
                for g in raw.get("gaps", [])
            ],
            period_from=raw["period_from"],
            period_to=raw["period_to"],
            agent_count=raw.get("agent_count", 0),
            total_events=raw.get("total_events", 0),
        )

    async def generate(
        self,
        regulation: str,
        date_from: str,
        date_to: str,
        agent_ids: Optional[List[str]] = None,
        include_attachments: bool = False,
        signatory_email: Optional[str] = None,
    ) -> EvidenceBundle:
        raw = await self._http.request(
            "POST",
            "/api/v1/compliance/evidence-export",
            body={
                "regulation": regulation,
                "date_from": date_from,
                "date_to": date_to,
                "agent_ids": agent_ids,
                "include_attachments": include_attachments,
                "signatory_email": signatory_email,
            },
        )
        return _map_bundle(raw)

    async def download(self, bundle_id: str, fmt: EvidenceFormat = "json") -> Any:
        return await self._http.request(
            "GET",
            f"/api/v1/compliance/evidence-bundles/{bundle_id}",
            query={"format": fmt},
        )

    async def list(
        self,
        regulation: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[EvidenceBundle]:
        query: Dict[str, str] = {}
        if regulation: query["regulation"] = regulation
        if limit:      query["limit"]      = str(limit)
        raw_list = await self._http.request("GET", "/api/v1/compliance/evidence-bundles", query=query)
        return [_map_bundle(r) for r in raw_list]


def _map_bundle(raw: Dict[str, Any]) -> EvidenceBundle:
    return EvidenceBundle(
        id=raw["id"],
        tenant_id=raw.get("tenant_id", ""),
        regulation=raw["regulation"],
        status=raw.get("status", "ready"),
        overall_score=raw.get("overall_score", 0.0),
        article_count=raw.get("article_count", 0),
        evidence_item_count=raw.get("evidence_item_count", 0),
        signature_hash=raw.get("signature_hash"),
        download_url=raw.get("download_url"),
        expires_at=raw.get("expires_at"),
        created_at=raw.get("created_at", ""),
    )
