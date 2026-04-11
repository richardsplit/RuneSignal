/**
 * RuneSignal typed API client
 *
 * Tenant ID is resolved at runtime from TenantContext (React) or middleware
 * (server-side). No hardcoded tenant IDs — callers must provide tenantId
 * via apiFetch options or the request will rely on the middleware-injected
 * X-Tenant-Id header from the authenticated session.
 */

const BASE = '/api/v1';

/**
 * Setter for the per-session tenant ID. Called by useTenant() hook or
 * layout-level bootstrap so all subsequent apiFetch calls include it.
 */
let _sessionTenantId: string | null = null;
export function setSessionTenantId(id: string | null) {
  _sessionTenantId = id;
}
export function getSessionTenantId(): string | null {
  return _sessionTenantId;
}

/* ─── Shared types ───────────────────────────────────────────────────── */
export interface AgentCredential {
  id: string;
  tenant_id: string;
  agent_name: string;
  agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom';
  framework?: string;
  status: 'active' | 'suspended' | 'revoked';
  created_by?: string;
  created_at: string;
  last_seen_at?: string;
}

export interface ExceptionTicket {
  id: string;
  tenant_id: string;
  agent_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'approved' | 'rejected' | 'escalated';
  context_data: Record<string, unknown>;
  assigned_to?: string;
  resolved_by?: string;
  resolution_reason?: string;
  sla_deadline?: string;
  created_at: string;
  resolved_at?: string;
  agent_credentials?: { agent_name: string };
}

export interface AgentRiskProfile {
  id: string;
  tenant_id: string;
  agent_id: string;
  risk_score: number;
  total_violations: number;
  hitl_escalations: number;
  model_version_anomalies: number;
  last_computed_at: string;
  agent_credentials?: { agent_name: string };
}


export interface ProvenanceLedgerEntry {
  request_id: string;
  event_type: string;
  agent_id?: string;
  payload: {
    certificate_id: string;
    tenant_id: string;
    agent_id: string | null;
    provider: string;
    model: string;
    model_version: string;
    input_hash: string;
    output_hash: string;
    tags: string[];
    timestamp: string;
  };
  created_at: string;
}

export interface AgentIntent {
  id: string;
  tenant_id: string;
  agent_id: string;
  intent_description: string;
  status: 'pending' | 'allowed' | 'blocked' | 'completed';
  metadata: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  agent_credentials?: { agent_name: string };
}

/* ─── Core fetch wrapper ─────────────────────────────────────────────── */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const tenantId = _sessionTenantId;
  if (!tenantId) {
    throw new ApiError(401, 'No tenant context — user must be authenticated');
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/* ─── Agents ─────────────────────────────────────────────────────────── */
export const agents = {
  list: (status?: 'active' | 'suspended' | 'revoked') =>
    apiFetch<{ agents: AgentCredential[] }>(
      status ? `/agents?status=${status}` : '/agents',
    ),

  register: (body: {
    agent_name: string;
    agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom';
    framework?: string;
    scopes?: { resource: string; actions: string[] }[];
  }) =>
    apiFetch<{ agent: AgentCredential; token: string }>('/agents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

/* ─── Exceptions ─────────────────────────────────────────────────────── */
export const exceptions = {
  list: (status?: 'open' | 'approved' | 'rejected' | 'escalated') =>
    apiFetch<{ exceptions: ExceptionTicket[] }>(
      status ? `/exceptions?status=${status}` : '/exceptions',
    ),

  resolve: (ticket_id: string, action: 'approve' | 'reject', reason: string) =>
    apiFetch<{ exception: ExceptionTicket }>('/exceptions', {
      method: 'PUT',
      body: JSON.stringify({ ticket_id, action, reason, reviewer_id: 'admin' }),
    }),
};


/* ─── Provenance ─────────────────────────────────────────────────────── */
export const provenance = {
  list: (limit = 50) =>
    apiFetch<{ data: ProvenanceLedgerEntry[] }>(`/provenance?limit=${limit}`),

  verify: (id: string) =>
    apiFetch<{ valid: boolean; reason: string }>(`/provenance/verify/${id}`),
};

/* ─── Intent / Conflict ──────────────────────────────────────────────── */
export const intent = {
  list: (limit = 50) =>
    apiFetch<{ intents: AgentIntent[] }>(`/intent?limit=${limit}`),
};

/* ─── Health (outside /v1 prefix — no tenant required) ──────────────── */
export async function checkHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.json() as Promise<{ status: string; timestamp: string; version: string }>;
}
