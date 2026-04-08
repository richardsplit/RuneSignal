"""TrustLayer Python SDK — Agents resource."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from .client import BaseClient
from .types import Agent, RegisterAgentResponse, AgentScope


class AgentsResource:
    def __init__(self, client: BaseClient) -> None:
        self._client = client

    async def register(
        self,
        name: str,
        agent_type: str,
        framework: Optional[str] = None,
        public_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        scopes: Optional[List[AgentScope]] = None,
    ) -> RegisterAgentResponse:
        """Register a new AI agent and get a JWT identity token."""
        payload: Dict[str, Any] = {
            "agent_name": name,
            "agent_type": agent_type,
        }
        if framework is not None:
            payload["framework"] = framework
        if public_key is not None:
            payload["public_key"] = public_key
        if metadata is not None:
            payload["metadata"] = metadata
        if scopes is not None:
            payload["scopes"] = [
                {"resource": s.resource, "actions": s.actions, "conditions": s.conditions}
                for s in scopes
            ]

        data = await self._client.request("POST", "/api/v1/agents/register", body=payload)
        agent_data = data.get("agent", data)
        return RegisterAgentResponse(
            agent=Agent(
                id=agent_data.get("id", ""),
                tenant_id=agent_data.get("tenant_id", ""),
                agent_name=agent_data.get("agent_name", name),
                agent_type=agent_data.get("agent_type", agent_type),
                status=agent_data.get("status", "active"),
                framework=agent_data.get("framework"),
                metadata=agent_data.get("metadata"),
                created_at=agent_data.get("created_at", ""),
            ),
            token=data.get("token", ""),
        )

    async def get(self, agent_id: str) -> Agent:
        """Retrieve agent details."""
        data = await self._client.request("GET", f"/api/v1/agents/{agent_id}")
        return Agent(
            id=data.get("id", ""),
            tenant_id=data.get("tenant_id", ""),
            agent_name=data.get("agent_name", data.get("name", "")),
            agent_type=data.get("agent_type", ""),
            status=data.get("status", "active"),
            framework=data.get("framework"),
            metadata=data.get("metadata"),
            created_at=data.get("created_at", ""),
        )

    async def suspend(self, agent_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Suspend an agent."""
        payload: Dict[str, Any] = {"action": "suspend"}
        if reason:
            payload["reason"] = reason
        return await self._client.request("PATCH", f"/api/v1/agents/{agent_id}", body=payload)

    async def reactivate(self, agent_id: str) -> Dict[str, Any]:
        """Reactivate a suspended agent."""
        return await self._client.request(
            "PATCH", f"/api/v1/agents/{agent_id}", body={"action": "reactivate"}
        )

    async def revoke(self, agent_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Permanently revoke an agent."""
        params: Dict[str, Any] = {}
        if reason:
            params["reason"] = reason
        return await self._client.request("DELETE", f"/api/v1/agents/{agent_id}", query=params)

    async def rotate_token(self, agent_id: str) -> Dict[str, str]:
        """Rotate the agent's JWT token. Returns {'token': '...', 'expires_at': '...'}."""
        return await self._client.request("POST", f"/api/v1/agents/{agent_id}/rotate")
