"""
RuneSignal Python SDK

AI Agent Governance — HITL approvals, Ed25519 provenance,
EU AI Act evidence bundles, compliance controls, firewall.

Example:
    import asyncio
    from runesignal import RuneSignalClient

    async def main():
        client = RuneSignalClient(api_key="rs_live_your_key", agent_id="agt-001")

        # Gate a sensitive action through HITL
        ticket = await client.approvals.request_approval(
            agent_id="agt-001",
            action_type="database.delete",
            action_summary="Delete 4,200 pricing records",
            blast_radius={"reversible": False, "level": "high"},
        )
        if ticket.status == "approved":
            pass  # proceed

        # Generate an EU AI Act evidence bundle
        bundle = await client.evidence.generate(
            regulation="eu_ai_act",
            date_from="2026-01-01",
            date_to="2026-03-31",
        )
        print(f"Evidence bundle: {bundle.id} | Coverage: {bundle.overall_score}%")

    asyncio.run(main())
"""

from .client import RuneSignalClient
from .types import (
    RuneSignalError,
    AuthenticationError,
    RateLimitError,
    FirewallBlockError,
    EvaluateRequest,
    EvaluateResponse,
    Verdict,
    RegisterAgentRequest,
    Agent,
    CertifyRequest,
    ProvenanceCertificate,
)
from .approvals import ApprovalTicket, SubmitApprovalRequest
from .evidence import EvidenceBundle, EvidencePreview, Regulation
from .incidents import Incident, IncidentCategory, IncidentSeverity
from .controls import Control, ControlsSummary
from .metrics import PlatformMetrics

__version__ = "1.0.0"

__all__ = [
    "RuneSignalClient",
    "__version__",
    # Errors
    "RuneSignalError",
    "AuthenticationError",
    "RateLimitError",
    "FirewallBlockError",
    # Firewall
    "EvaluateRequest",
    "EvaluateResponse",
    "Verdict",
    # Agents
    "RegisterAgentRequest",
    "Agent",
    # Provenance
    "CertifyRequest",
    "ProvenanceCertificate",
    # Approvals
    "ApprovalTicket",
    "SubmitApprovalRequest",
    # Evidence
    "EvidenceBundle",
    "EvidencePreview",
    "Regulation",
    # Incidents
    "Incident",
    "IncidentCategory",
    "IncidentSeverity",
    # Controls
    "Control",
    "ControlsSummary",
    # Metrics
    "PlatformMetrics",
]
