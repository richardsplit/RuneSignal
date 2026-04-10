/**
 * TrustLayer typed API client
 *
 * All requests inject X-Tenant-Id from NEXT_PUBLIC_TENANT_ID env var.
 * When the env var is absent (local dev without Supabase) every call rejects
 * with a predictable error so callers can fall back to demo data gracefully.
 */

/* ─── Config ─────────────────────────────────────────────────────────── */
export const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

const BASE = '/api/v1';

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

export interface InsuranceClaim {
  id: string;
  tenant_id: string;
  agent_id: string;
  incident_type: string;
  financial_impact: number;
  description: string;
  status: 'filed' | 'investigating' | 'approved' | 'denied';
  filed_at: string;
  resolved_at?: string;
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
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT_ID,
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

/* ─── Insurance ──────────────────────────────────────────────────────── */
export const insurance = {
  profiles: () =>
    apiFetch<{ profiles: AgentRiskProfile[] }>('/insurance'),

  premium: (agent_id: string) =>
    apiFetch<{
      agent_id: string;
      base_premium: number;
      risk_multiplier: number;
      final_premium: number;
      risk_score: number;
      risk_factors: string[];
    }>(`/insurance?agent_id=${agent_id}`),

  fileClaim: (body: {
    agent_id: string;
    incident_type: string;
    financial_impact: number;
    description?: string;
  }) =>
    apiFetch<{ message: string; claim: InsuranceClaim }>('/insurance', {
      method: 'POST',
      body: JSON.stringify(body),
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

/* ─── Health (outside /v1 prefix) ───────────────────────────────────── */
export async function checkHealth() {
  const res = await fetch('/api/health', {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.json() as Promise<{ status: string; timestamp: string; version: string }>;
}
