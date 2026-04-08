"""
TrustLayer Python SDK — Type Definitions
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Literal
from enum import Enum


class Verdict(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    ESCALATE = "escalate"


class Priority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ExceptionStatus(str, Enum):
    OPEN = "open"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"


# ─── Firewall ─────────────────────────────────────────────────────────────────

@dataclass
class EvaluateRequest:
    action: str
    resource: str
    agent_id: Optional[str] = None
    tool_name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[Literal["finance", "security", "compliance", "comms", "ip", "ops"]] = None
    metadata: Optional[Dict[str, Any]] = None
    risk_threshold: Optional[int] = None


@dataclass
class CheckResult:
    check: str
    passed: bool
    detail: str
    latency_ms: int


@dataclass
class EvaluateResponse:
    evaluation_id: str
    verdict: Verdict
    risk_score: int
    checks: List[CheckResult]
    reasons: List[str]
    certificate_id: Optional[str] = None
    hitl_ticket_id: Optional[str] = None
    latency_ms: int = 0


# ─── Agents ───────────────────────────────────────────────────────────────────

@dataclass
class AgentScope:
    resource: str
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None


@dataclass
class RegisterAgentRequest:
    agent_name: str
    agent_type: str
    framework: Optional[str] = None
    public_key: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    scopes: Optional[List[AgentScope]] = None


@dataclass
class Agent:
    id: str
    tenant_id: str
    agent_name: str
    agent_type: str
    status: str
    framework: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str = ""


@dataclass
class RegisterAgentResponse:
    agent: Agent
    token: str


# ─── Exceptions (HITL) ────────────────────────────────────────────────────────

@dataclass
class CreateExceptionRequest:
    title: str
    description: str
    priority: Priority = Priority.MEDIUM
    context_data: Optional[Dict[str, Any]] = None


@dataclass
class ExceptionTicket:
    id: str
    tenant_id: str
    agent_id: str
    title: str
    description: str
    priority: Priority
    status: ExceptionStatus
    sla_deadline: str
    created_at: str
    resolved_by: Optional[str] = None
    resolution_reason: Optional[str] = None
    resolved_at: Optional[str] = None


@dataclass
class ResolveExceptionRequest:
    action: Literal["approve", "reject"]
    reviewer_id: str
    reason: str


# ─── Provenance ───────────────────────────────────────────────────────────────

@dataclass
class CertifyRequest:
    provider: Literal["openai", "anthropic", "google", "custom"]
    model: str
    prompt: str
    completion: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ProvenanceCertificate:
    id: str
    tenant_id: str
    provider: str
    model: str
    input_hash: str
    output_hash: str
    signature: str
    created_at: str
    agent_id: Optional[str] = None


# ─── Errors ───────────────────────────────────────────────────────────────────

class TrustLayerError(Exception):
    def __init__(self, message: str, status: int, code: Optional[str] = None):
        super().__init__(message)
        self.status = status
        self.code = code


class AuthenticationError(TrustLayerError):
    def __init__(self, message: str = "Invalid API key"):
        super().__init__(message, 401, "AUTHENTICATION_ERROR")


class RateLimitError(TrustLayerError):
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, 429, "RATE_LIMIT_ERROR")


class FirewallBlockError(TrustLayerError):
    def __init__(self, evaluation: EvaluateResponse):
        reasons = "; ".join(evaluation.reasons)
        super().__init__(f"Action blocked: {reasons}", 403, "FIREWALL_BLOCK")
        self.evaluation = evaluation
