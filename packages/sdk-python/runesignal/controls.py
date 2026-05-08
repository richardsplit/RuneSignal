"""RuneSignal Python SDK — Compliance Controls"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .http import BaseHTTPClient


@dataclass
class Control:
    id: str
    name: str
    description: str
    framework: str
    framework_clause: str
    status: str
    evidence_count: int
    frequency: str
    last_evaluated_at: Optional[str] = None
    next_evaluation_at: Optional[str] = None
    failure_reason: Optional[str] = None


@dataclass
class ControlsSummary:
    total: int
    passing: int
    failing: int
    not_evaluated: int
    not_applicable: int
    overall_health_pct: float


@dataclass
class SeedResult:
    seeded: int
    skipped: int
    framework: str


class ControlsResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def seed(self, framework: str = "eu_ai_act") -> SeedResult:
        raw = await self._http.request("POST", "/api/v1/controls/seed", body={"framework": framework})
        return SeedResult(seeded=raw["seeded"], skipped=raw["skipped"], framework=raw["framework"])

    async def list(
        self,
        framework: Optional[str] = None,
        status: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Control]:
        query: Dict[str, str] = {}
        if framework: query["framework"] = framework
        if status:    query["status"]    = status
        if limit:     query["limit"]     = str(limit)
        raw_list = await self._http.request("GET", "/api/v1/controls", query=query)
        return [_map_control(r) for r in raw_list]

    async def evaluate(self, control_id: str) -> Control:
        raw = await self._http.request("POST", f"/api/v1/controls/{control_id}/evaluate")
        return _map_control(raw)

    async def status(self) -> ControlsSummary:
        raw = await self._http.request("GET", "/api/v1/controls/status")
        return ControlsSummary(
            total=raw.get("total", 0),
            passing=raw.get("passing", 0),
            failing=raw.get("failing", 0),
            not_evaluated=raw.get("not_evaluated", 0),
            not_applicable=raw.get("not_applicable", 0),
            overall_health_pct=raw.get("overall_health_pct", 0.0),
        )


def _map_control(raw: Dict[str, Any]) -> Control:
    return Control(
        id=raw["id"],
        name=raw["name"],
        description=raw.get("description", ""),
        framework=raw["framework"],
        framework_clause=raw.get("framework_clause", ""),
        status=raw["status"],
        evidence_count=raw.get("evidence_count", 0),
        frequency=raw.get("frequency", "daily"),
        last_evaluated_at=raw.get("last_evaluated_at"),
        next_evaluation_at=raw.get("next_evaluation_at"),
        failure_reason=raw.get("failure_reason"),
    )
