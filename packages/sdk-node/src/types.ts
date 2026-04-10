/**
 * RuneSignal Node SDK — Type Definitions
 */

// ─── Client Config ───────────────────────────────────────────────────────────

export interface RuneSignalClientConfig {
  apiKey: string;
  baseUrl?: string;      // Default: https://app.runesignal.ai
  agentId?: string;      // Default agent ID sent as X-Agent-Id
  timeout?: number;      // Request timeout in ms (default: 10000)
  maxRetries?: number;   // Number of retries on 5xx (default: 2)
}

// ─── Firewall ─────────────────────────────────────────────────────────────────

export interface EvaluateRequest {
  action: string;
  resource: string;
  agentId?: string;      // Overrides client-level agentId
  toolName?: string;
  description?: string;
  domain?: 'finance' | 'security' | 'compliance' | 'comms' | 'ip' | 'ops';
  metadata?: Record<string, unknown>;
  riskThreshold?: number;
}

export type Verdict = 'allow' | 'block' | 'escalate';

export interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
  latencyMs: number;
}

export interface EvaluateResponse {
  evaluationId: string;
  verdict: Verdict;
  riskScore: number;
  checks: CheckResult[];
  reasons: string[];
  certificateId?: string;
  hitlTicketId?: string;
  latencyMs: number;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export interface AgentScope {
  resource: string;
  actions: string[];
  conditions?: Record<string, unknown>;
}

export interface RegisterAgentRequest {
  agentName: string;
  agentType: string;
  framework?: string;
  publicKey?: string;
  metadata?: Record<string, unknown>;
  scopes?: AgentScope[];
}

export interface Agent {
  id: string;
  tenantId: string;
  agentName: string;
  agentType: string;
  status: 'active' | 'suspended' | 'revoked';
  framework?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RegisterAgentResponse {
  agent: Agent;
  token: string;
}

// ─── Exceptions (HITL) ────────────────────────────────────────────────────────

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ExceptionStatus = 'open' | 'approved' | 'rejected' | 'escalated';

export interface CreateExceptionRequest {
  title: string;
  description: string;
  priority?: Priority;
  contextData?: Record<string, unknown>;
}

export interface ExceptionTicket {
  id: string;
  tenantId: string;
  agentId: string;
  title: string;
  description: string;
  priority: Priority;
  status: ExceptionStatus;
  slaDeadline: string;
  resolvedBy?: string;
  resolutionReason?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ResolveExceptionRequest {
  action: 'approve' | 'reject';
  reviewerId: string;
  reason: string;
}

// ─── Provenance ───────────────────────────────────────────────────────────────

export interface CertifyRequest {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  model: string;
  prompt: string;
  completion: string;
  metadata?: Record<string, unknown>;
}

export interface ProvenanceCertificate {
  id: string;
  tenantId: string;
  agentId?: string;
  provider: string;
  model: string;
  inputHash: string;
  outputHash: string;
  signature: string;
  createdAt: string;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class RuneSignalError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = 'RuneSignalError';
  }
}

export class AuthenticationError extends RuneSignalError {
  constructor(message = 'Invalid API key') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends RuneSignalError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class FirewallBlockError extends RuneSignalError {
  public readonly evaluation: EvaluateResponse;
  constructor(evaluation: EvaluateResponse) {
    super(`Action blocked: ${evaluation.reasons.join('; ')}`, 403, 'FIREWALL_BLOCK');
    this.name = 'FirewallBlockError';
    this.evaluation = evaluation;
  }
}
