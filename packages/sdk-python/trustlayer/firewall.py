"""
TrustLayer Python SDK — Firewall Resource
"""

from __future__ import annotations
from typing import List, Optional

from .client import BaseClient
from .types import EvaluateRequest, EvaluateResponse, CheckResult, Verdict, FirewallBlockError


class FirewallResource:
    def __init__(self, client: BaseClient):
        self._client = client

    async def evaluate(
        self,
        request: EvaluateRequest,
        *,
        agent_id: Optional[str] = None,
        throw_on_block: bool = False,
    ) -> EvaluateResponse:
        """
        Evaluates an agent action through the TrustLayer governance pipeline.

        Returns an EvaluateResponse with verdict: 'allow', 'block', or 'escalate'.
        If throw_on_block=True, raises FirewallBlockError on block verdicts.

        Example:
            result = await tl.firewall.evaluate(EvaluateRequest(
                action="delete_user_record",
                resource="crm:contacts",
                description="Delete customer record per GDPR request",
            ))
            if result.verdict == Verdict.ALLOW:
                # proceed
                pass
        """
        body = {
            "action": request.action,
            "resource": request.resource,
        }
        if request.tool_name:
            body["tool_name"] = request.tool_name
        if request.description:
            body["description"] = request.description
        if request.domain:
            body["domain"] = request.domain
        if request.metadata:
            body["metadata"] = request.metadata
        if request.risk_threshold is not None:
            body["risk_threshold"] = request.risk_threshold

        try:
            raw = await self._client.request(
                "POST",
                "/api/v1/firewall/evaluate",
                body=body,
                agent_id=agent_id or request.agent_id,
            )
        except Exception as e:
            # Re-raise — block verdicts come as 403 which BaseClient raises as TrustLayerError
            raise

        result = _map_evaluation(raw)

        if throw_on_block and result.verdict == Verdict.BLOCK:
            raise FirewallBlockError(result)

        return result

    async def list(
        self,
        limit: int = 50,
        verdict: Optional[Verdict] = None,
    ) -> List[EvaluateResponse]:
        """Lists recent firewall evaluations."""
        query = {"limit": str(limit)}
        if verdict:
            query["verdict"] = verdict.value

        raw_list = await self._client.request("GET", "/api/v1/firewall/evaluations", query=query)
        return [_map_evaluation(r) for r in (raw_list or [])]


def _map_evaluation(raw: dict) -> EvaluateResponse:
    return EvaluateResponse(
        evaluation_id=raw.get("evaluation_id") or raw.get("id", ""),
        verdict=Verdict(raw.get("verdict", "allow")),
        risk_score=raw.get("risk_score", 0),
        checks=[
            CheckResult(
                check=c.get("check", ""),
                passed=c.get("passed", True),
                detail=c.get("detail", ""),
                latency_ms=c.get("latency_ms", 0),
            )
            for c in (raw.get("checks") or [])
        ],
        reasons=raw.get("reasons") or [],
        certificate_id=raw.get("certificate_id"),
        hitl_ticket_id=raw.get("hitl_ticket_id"),
        latency_ms=raw.get("latency_ms", 0),
    )
