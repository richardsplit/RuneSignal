"""RuneSignal Python SDK — Main Client"""
from __future__ import annotations

from typing import Optional

from .http import BaseHTTPClient
from .firewall import FirewallResource
from .agents import AgentsResource
from .provenance import ProvenanceResource
from .approvals import ApprovalsResource
from .evidence import EvidenceResource
from .incidents import IncidentsResource
from .controls import ControlsResource
from .metrics import MetricsResource


class RuneSignalClient:
    """
    Official Python client for the RuneSignal AI Governance platform.

    Modules:
        firewall   — Evaluate agent actions (allow / block / escalate)
        agents     — Register and manage AI agents
        approvals  — HITL approval gateway (submit, poll, resolve)
        provenance — Ed25519-sign any LLM call (S3 cryptographic ledger)
        evidence   — Generate EU AI Act / ISO 42001 evidence bundles
        incidents  — Report compliance incidents with idempotency
        controls   — Seed, evaluate, and monitor compliance controls
        metrics    — Aggregate platform KPIs

    Example::

        import asyncio
        from runesignal import RuneSignalClient

        async def main():
            client = RuneSignalClient(api_key="rs_live_...")

            # Firewall evaluation
            result = await client.firewall.evaluate(
                EvaluateRequest(action="delete_records", resource="db:users")
            )
            print(result.verdict)  # allow | block | escalate

            # HITL approval
            ticket = await client.approvals.request_approval(
                agent_id="agt-001",
                action_type="database.delete",
                action_summary="Delete 4,200 pricing rows",
                blast_radius={"reversible": False, "level": "high"},
            )

            # Evidence bundle
            bundle = await client.evidence.generate(
                regulation="eu_ai_act",
                date_from="2026-01-01",
                date_to="2026-03-31",
            )

        asyncio.run(main())
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://app.runesignal.ai",
        agent_id: Optional[str] = None,
        timeout: float = 10.0,
        max_retries: int = 2,
    ):
        self._http = BaseHTTPClient(
            api_key=api_key,
            base_url=base_url,
            agent_id=agent_id,
            timeout=timeout,
            max_retries=max_retries,
        )

        self.firewall   = FirewallResource(self._http)
        self.agents     = AgentsResource(self._http)
        self.provenance = ProvenanceResource(self._http)
        self.approvals  = ApprovalsResource(self._http)
        self.evidence   = EvidenceResource(self._http)
        self.incidents  = IncidentsResource(self._http)
        self.controls   = ControlsResource(self._http)
        self.metrics    = MetricsResource(self._http)
