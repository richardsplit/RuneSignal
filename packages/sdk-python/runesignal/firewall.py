"""RuneSignal Python SDK — Firewall Resource"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from .http import BaseHTTPClient
from .types import EvaluateRequest, EvaluateResponse, CheckResult, FirewallBlockError


class FirewallResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def evaluate(
        self,
        request: EvaluateRequest,
        agent_id: Optional[str] = None,
        throw_on_block: bool = False,
    ) -> EvaluateResponse:
        try:
            raw = await self._http.request(
                "POST",
                "/api/v1/firewall/evaluate",
                body={
                    "action":         request.action,
                    "resource":       request.resource,
                    "tool_name":      request.tool_name,
                    "description":    request.description,
                    "domain":         request.domain,
                    "metadata":       request.metadata,
                    "risk_threshold": request.risk_threshold,
                },
                agent_id=agent_id or request.agent_id,
            )
        except Exception as e:
            if hasattr(e, "status") and e.status == 403 and hasattr(e, "detail"):  # type: ignore
                raw = e.detail  # type: ignore
            else:
                raise

        result = EvaluateResponse(
            evaluation_id=raw["evaluation_id"],
            verdict=raw["verdict"],
            risk_score=raw["risk_score"],
            checks=[
                CheckResult(
                    check=c["check"],
                    passed=c["passed"],
                    detail=c["detail"],
                    latency_ms=c.get("latency_ms", 0),
                )
                for c in raw.get("checks", [])
            ],
            reasons=raw.get("reasons", []),
            certificate_id=raw.get("certificate_id"),
            hitl_ticket_id=raw.get("hitl_ticket_id"),
            latency_ms=raw.get("latency_ms", 0),
        )

        if throw_on_block and result.verdict == "block":
            raise FirewallBlockError(result)

        return result

    async def list(
        self,
        verdict: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[EvaluateResponse]:
        query: Dict[str, str] = {}
        if verdict: query["verdict"] = verdict
        if limit:   query["limit"]   = str(limit)
        raw_list = await self._http.request("GET", "/api/v1/firewall/evaluations", query=query)
        return [
            EvaluateResponse(
                evaluation_id=r.get("id", ""),
                verdict=r["verdict"],
                risk_score=r.get("risk_score", 0),
                checks=[],
                reasons=r.get("reasons", []),
                certificate_id=r.get("certificate_id"),
                hitl_ticket_id=r.get("hitl_ticket_id"),
                latency_ms=r.get("latency_ms", 0),
            )
            for r in raw_list
        ]
