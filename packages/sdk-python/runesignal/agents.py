"""RuneSignal Python SDK — Agents Resource"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from .http import BaseHTTPClient
from .types import Agent, RegisterAgentRequest


class AgentsResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def register(self, request: RegisterAgentRequest) -> Dict[str, Any]:
        raw = await self._http.request(
            "POST",
            "/api/v1/agents",
            body={
                "agent_name":  request.agent_name,
                "agent_type":  request.agent_type,
                "framework":   request.framework,
                "public_key":  request.public_key,
                "metadata":    request.metadata,
                "scopes": [
                    {"resource": s.resource, "actions": s.actions, "conditions": s.conditions}
                    for s in (request.scopes or [])
                ],
            },
        )
        return {"agent": _map_agent(raw.get("agent", raw)), "token": raw.get("token")}

    async def list(
        self,
        status: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Agent]:
        query: Dict[str, str] = {}
        if status: query["status"] = status
        if limit:  query["limit"]  = str(limit)
        raw = await self._http.request("GET", "/api/v1/agents", query=query)
        items = raw.get("agents", raw) if isinstance(raw, dict) else raw
        return [_map_agent(a) for a in items]

    async def get(self, agent_id: str) -> Agent:
        raw = await self._http.request("GET", f"/api/v1/agents/{agent_id}")
        return _map_agent(raw)

    async def export(self, fmt: Literal["json", "csv", "veza"] = "json") -> Any:
        return await self._http.request("GET", "/api/v1/agents/export", query={"format": fmt})

    async def revoke(self, agent_id: str) -> Agent:
        raw = await self._http.request("POST", f"/api/v1/agents/{agent_id}/revoke")
        return _map_agent(raw)


def _map_agent(raw: Dict[str, Any]) -> Agent:
    return Agent(
        id=raw["id"],
        tenant_id=raw.get("tenant_id", ""),
        agent_name=raw.get("agent_name", ""),
        agent_type=raw.get("agent_type", ""),
        status=raw.get("status", "active"),
        framework=raw.get("framework"),
        metadata=raw.get("metadata"),
        created_at=raw.get("created_at", ""),
    )
