"""RuneSignal Python SDK — Incidents"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

from .http import BaseHTTPClient

IncidentCategory = Literal[
    "data_breach", "policy_violation", "agent_misbehaviour",
    "bias_fairness", "availability", "third_party", "other"
]
IncidentSeverity = Literal["critical", "high", "medium", "low"]
IncidentStatus   = Literal["open", "investigating", "resolved", "closed"]


@dataclass
class Incident:
    id: str
    tenant_id: str
    title: str
    description: str
    category: str
    severity: str
    status: str
    reported_by: str
    related_agent_ids: List[str] = field(default_factory=list)
    is_serious_incident: bool = False
    regulatory_notification_required: bool = False
    resolved_at: Optional[str] = None
    created_at: str = ""


class IncidentsResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def create(
        self,
        title: str,
        description: str,
        category: str,
        severity: str,
        reported_by: str,
        related_agent_ids: Optional[List[str]] = None,
        is_serious_incident: bool = False,
        regulatory_notification_required: bool = False,
        idempotency_key: Optional[str] = None,
    ) -> Incident:
        raw = await self._http.request(
            "POST",
            "/api/v1/incidents",
            body={
                "title": title,
                "description": description,
                "category": category,
                "severity": severity,
                "reported_by": reported_by,
                "related_agent_ids": related_agent_ids or [],
                "is_serious_incident": is_serious_incident,
                "regulatory_notification_required": regulatory_notification_required,
                "idempotency_key": idempotency_key,
            },
            idempotency_key=idempotency_key,
        )
        return _map_incident(raw)

    async def get(self, incident_id: str) -> Incident:
        raw = await self._http.request("GET", f"/api/v1/incidents/{incident_id}")
        return _map_incident(raw)

    async def list(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Incident]:
        query: Dict[str, str] = {}
        if status:   query["status"]   = status
        if severity: query["severity"] = severity
        if limit:    query["limit"]    = str(limit)
        raw_list = await self._http.request("GET", "/api/v1/incidents", query=query)
        return [_map_incident(r) for r in raw_list]

    async def update(self, incident_id: str, status: Optional[str] = None) -> Incident:
        raw = await self._http.request(
            "PATCH",
            f"/api/v1/incidents/{incident_id}",
            body={"status": status},
        )
        return _map_incident(raw)


def _map_incident(raw: Dict[str, Any]) -> Incident:
    return Incident(
        id=raw["id"],
        tenant_id=raw.get("tenant_id", ""),
        title=raw["title"],
        description=raw.get("description", ""),
        category=raw["category"],
        severity=raw["severity"],
        status=raw["status"],
        reported_by=raw.get("reported_by", ""),
        related_agent_ids=raw.get("related_agent_ids", []),
        is_serious_incident=raw.get("is_serious_incident", False),
        regulatory_notification_required=raw.get("regulatory_notification_required", False),
        resolved_at=raw.get("resolved_at"),
        created_at=raw.get("created_at", ""),
    )
