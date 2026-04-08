"""TrustLayer Python SDK — Exceptions (HITL) resource."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from .client import BaseClient
from .types import ExceptionTicket, Priority, ExceptionStatus


class ExceptionsResource:
    def __init__(self, client: BaseClient) -> None:
        self._client = client

    async def create(
        self,
        title: str,
        description: str,
        priority: Priority = Priority.MEDIUM,
        agent_id: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> ExceptionTicket:
        """Create a new HITL exception ticket."""
        payload: Dict[str, Any] = {
            "title": title,
            "description": description,
            "priority": priority.value if isinstance(priority, Priority) else priority,
        }
        if agent_id is not None:
            payload["agent_id"] = agent_id
        if context_data is not None:
            payload["context_data"] = context_data

        data = await self._client.request("POST", "/api/v1/exceptions", body=payload)
        return _map_ticket(data)

    async def resolve(
        self,
        ticket_id: str,
        action: str,  # "approve" | "reject"
        reviewer_id: str,
        reason: str,
    ) -> Dict[str, Any]:
        """Approve or reject a HITL exception."""
        payload: Dict[str, Any] = {
            "action": action,
            "reviewer_id": reviewer_id,
            "reason": reason,
        }
        return await self._client.request(
            "POST", f"/api/v1/exceptions/{ticket_id}/resolve", body=payload
        )

    async def list(
        self,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[ExceptionTicket]:
        """List HITL exception tickets."""
        params: Dict[str, Any] = {"limit": limit}
        if status is not None:
            params["status"] = status

        data = await self._client.request("GET", "/api/v1/exceptions", query=params)
        tickets = data if isinstance(data, list) else data.get("exceptions", [])
        return [_map_ticket(t) for t in tickets]


def _map_ticket(data: Dict[str, Any]) -> ExceptionTicket:
    return ExceptionTicket(
        id=data.get("id", ""),
        tenant_id=data.get("tenant_id", ""),
        agent_id=data.get("agent_id", ""),
        title=data.get("title", ""),
        description=data.get("description", ""),
        priority=Priority(data.get("priority", "medium")),
        status=ExceptionStatus(data.get("status", "open")),
        sla_deadline=data.get("sla_deadline", data.get("created_at", "")),
        created_at=data.get("created_at", ""),
        resolved_by=data.get("resolved_by") or data.get("reviewer_id"),
        resolution_reason=data.get("resolution_reason") or data.get("resolution_note"),
        resolved_at=data.get("resolved_at"),
    )
