"""
TrustLayer Python SDK

The AI Agent Action Firewall for Enterprise Systems.
Control what your agents can do, enforce policy, route approvals,
and record every decision in a tamper-evident audit trail.

Example:
    import asyncio
    from trustlayer import TrustLayerClient
    from trustlayer.types import EvaluateRequest

    async def main():
        tl = TrustLayerClient(
            api_key="tl_your_api_key",
            agent_id="your-agent-uuid",
        )

        result = await tl.firewall.evaluate(EvaluateRequest(
            action="delete_user_record",
            resource="crm:contacts",
            description="Delete customer record per GDPR request",
        ))

        print(f"Verdict: {result.verdict}")
        print(f"Risk score: {result.risk_score}/100")

    asyncio.run(main())
"""

from .main import TrustLayerClient
from .types import (
    EvaluateRequest,
    EvaluateResponse,
    CheckResult,
    Verdict,
    Priority,
    ExceptionStatus,
    RegisterAgentRequest,
    RegisterAgentResponse,
    AgentScope,
    Agent,
    CreateExceptionRequest,
    ExceptionTicket,
    ResolveExceptionRequest,
    CertifyRequest,
    ProvenanceCertificate,
    TrustLayerError,
    AuthenticationError,
    RateLimitError,
    FirewallBlockError,
)

__all__ = [
    "TrustLayerClient",
    "EvaluateRequest",
    "EvaluateResponse",
    "CheckResult",
    "Verdict",
    "Priority",
    "ExceptionStatus",
    "RegisterAgentRequest",
    "RegisterAgentResponse",
    "AgentScope",
    "Agent",
    "CreateExceptionRequest",
    "ExceptionTicket",
    "ResolveExceptionRequest",
    "CertifyRequest",
    "ProvenanceCertificate",
    "TrustLayerError",
    "AuthenticationError",
    "RateLimitError",
    "FirewallBlockError",
]

__version__ = "1.0.0"
