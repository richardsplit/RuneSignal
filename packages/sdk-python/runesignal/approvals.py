"""RuneSignal Python SDK — Approvals (HITL Gateway)"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

from .http import BaseHTTPClient
from .types import RuneSignalError

ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]
BlastRadiusLevel = Literal["low", "medium", "high", "critical"]
SlaAutoAction = Literal["approve", "reject", "escalate"]


@dataclass
class ApprovalTicket:
    id: str
    agent_id: str
    action_type: str
    action_summary: str
    status: str
    sla_deadline: Optional[str] = None
    sla_auto_action: Optional[str] = None
    review_url: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_reason: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: str = ""


@dataclass
class SubmitApprovalRequest:
    agent_id: str
    action_type: str
    action_summary: str
    blast_radius: Dict[str, Any]
    payload: Optional[Dict[str, Any]] = None
    sla_hours: Optional[int] = None
    sla_auto_action: Optional[str] = None
    idempotency_key: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


def _map_ticket(raw: Dict[str, Any]) -> ApprovalTicket:
    return ApprovalTicket(
        id=raw["id"],
        agent_id=raw.get("agent_id", ""),
        action_type=raw.get("action_type", ""),
        action_summary=raw.get("action_summary", ""),
        status=raw.get("status", "pending"),
        sla_deadline=raw.get("sla_deadline"),
        sla_auto_action=raw.get("sla_auto_action"),
        review_url=raw.get("review_url"),
        resolved_by=raw.get("resolved_by"),
        resolved_at=raw.get("resolved_at"),
        resolution_reason=raw.get("resolution_reason"),
        idempotency_key=raw.get("idempotency_key"),
        created_at=raw.get("created_at", ""),
    )


class ApprovalsResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def submit(self, request: SubmitApprovalRequest) -> ApprovalTicket:
        raw = await self._http.request(
            "POST",
            "/api/v1/approval-requests",
            body={
                "agent_id": request.agent_id,
                "action_type": request.action_type,
                "action_summary": request.action_summary,
                "blast_radius": request.blast_radius,
                "payload": request.payload,
                "sla_hours": request.sla_hours,
                "sla_auto_action": request.sla_auto_action,
                "idempotency_key": request.idempotency_key,
                "metadata": request.metadata,
            },
            idempotency_key=request.idempotency_key,
        )
        return _map_ticket(raw)

    async def poll(
        self,
        ticket_id: str,
        interval_seconds: float = 5.0,
        timeout_seconds: float = 300.0,
    ) -> ApprovalTicket:
        import time
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            ticket = await self.get(ticket_id)
            if ticket.status != "pending":
                return ticket
            await asyncio.sleep(interval_seconds)
        raise RuneSignalError(
            f"Approval poll timed out after {timeout_seconds}s for ticket {ticket_id}",
            408,
            "APPROVAL_POLL_TIMEOUT",
        )

    async def request_approval(
        self,
        agent_id: str,
        action_type: str,
        action_summary: str,
        blast_radius: Dict[str, Any],
        payload: Optional[Dict[str, Any]] = None,
        sla_hours: Optional[int] = None,
        sla_auto_action: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        poll_interval: float = 5.0,
        poll_timeout: float = 300.0,
    ) -> ApprovalTicket:
        ticket = await self.submit(
            SubmitApprovalRequest(
                agent_id=agent_id,
                action_type=action_type,
                action_summary=action_summary,
                blast_radius=blast_radius,
                payload=payload,
                sla_hours=sla_hours,
                sla_auto_action=sla_auto_action,
                idempotency_key=idempotency_key,
            )
        )
        return await self.poll(ticket.id, poll_interval, poll_timeout)

    async def get(self, ticket_id: str) -> ApprovalTicket:
        raw = await self._http.request("GET", f"/api/v1/approval-requests/{ticket_id}")
        return _map_ticket(raw)

    async def resolve(
        self,
        ticket_id: str,
        action: Literal["approve", "reject"],
        reviewer_id: str,
        reason: Optional[str] = None,
    ) -> ApprovalTicket:
        raw = await self._http.request(
            "POST",
            f"/api/v1/approval-requests/{ticket_id}/resolve",
            body={"action": action, "reviewer_id": reviewer_id, "reason": reason},
        )
        return _map_ticket(raw)

    async def list(
        self,
        status: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[ApprovalTicket]:
        query: Dict[str, str] = {}
        if status:   query["status"]   = status
        if agent_id: query["agent_id"] = agent_id
        if limit:    query["limit"]    = str(limit)
        raw_list = await self._http.request("GET", "/api/v1/approval-requests", query=query)
        return [_map_ticket(r) for r in raw_list]
