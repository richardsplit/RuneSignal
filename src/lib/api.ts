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
  eu_ai_act_category?: 'prohibited' | 'high_risk' | 'limited_risk' | 'minimal_risk' | 'unclassified';
  classification_confidence?: string;
  classified_at?: string;
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

/* ─── Incidents ──────────────────────────────────────────────────────── */
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentCategory = 'operational' | 'safety' | 'rights_violation' | 'security' | 'compliance_gap';
export type IncidentStatus   = 'detected' | 'investigating' | 'mitigated' | 'reported' | 'closed';

export interface Incident {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  category: IncidentCategory;
  is_serious_incident: boolean;
  art73_report_deadline: string | null;
  art73_report_id: string | null;
  market_surveillance_authority: string | null;
  status: IncidentStatus;
  detected_at: string;
  investigating_since: string | null;
  mitigated_at: string | null;
  reported_at: string | null;
  closed_at: string | null;
  reported_by: string | null;
  incident_commander: string | null;
  related_anomaly_ids: string[];
  related_hitl_ids: string[];
  related_agent_ids: string[];
  related_firewall_ids: string[];
  root_cause: string | null;
  corrective_actions: Array<{ description: string; owner: string; deadline: string; status: 'pending' | 'done' }>;
  created_at: string;
  updated_at: string;
}

export interface IncidentTimelineEntry {
  id: string;
  incident_id: string;
  event_type: string;
  actor: string;
  detail: Record<string, unknown>;
  audit_event_id: string | null;
  created_at: string;
}

export const incidents = {
  list: (params?: { status?: IncidentStatus; severity?: IncidentSeverity; is_serious_incident?: boolean; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status)                q.set('status', params.status);
    if (params?.severity)              q.set('severity', params.severity);
    if (params?.is_serious_incident !== undefined) q.set('is_serious_incident', String(params.is_serious_incident));
    if (params?.limit)                 q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<{ incidents: Incident[]; total: number }>(`/incidents${qs ? '?' + qs : ''}`);
  },

  create: (body: {
    title: string;
    description?: string;
    severity: IncidentSeverity;
    category: IncidentCategory;
    is_serious_incident?: boolean;
    market_surveillance_authority?: string;
    reported_by: string;
    related_anomaly_ids?: string[];
    related_agent_ids?: string[];
  }) => apiFetch<Incident>('/incidents', { method: 'POST', body: JSON.stringify(body) }),

  getById: (id: string) =>
    apiFetch<Incident>(`/incidents/${id}`),

  patch: (id: string, body: Partial<Pick<Incident, 'status' | 'incident_commander' | 'root_cause'>>) =>
    apiFetch<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  timeline: (id: string) =>
    apiFetch<{ timeline: IncidentTimelineEntry[] }>(`/incidents/${id}/timeline`),

  addTimeline: (id: string, event_type: string, actor: string, detail?: Record<string, unknown>) =>
    apiFetch<IncidentTimelineEntry>(`/incidents/${id}/timeline`, {
      method: 'POST',
      body: JSON.stringify({ event_type, actor, detail }),
    }),

  generateArt73: (id: string) =>
    apiFetch<{ report_id: string; generated_at: string; bundle_hash: string }>(`/incidents/${id}/art73-report`, { method: 'POST' }),

  getArt73: (id: string) =>
    apiFetch<{ report: Record<string, unknown> }>(`/incidents/${id}/art73-report`),

  correctiveActions: (id: string) =>
    apiFetch<{ actions: Array<{ id: string; description: string; owner: string; due_date: string; status: string }> }>(`/incidents/${id}/corrective-actions`),

  addCorrectiveAction: (id: string, body: { description: string; owner?: string; due_date?: string }) =>
    apiFetch<{ id: string }>(`/incidents/${id}/corrective-actions`, { method: 'POST', body: JSON.stringify(body) }),
};

export interface AgentTimelineEvent {
  source: 'audit' | 'firewall' | 'hitl' | 'anomaly' | 'incident';
  event: Record<string, unknown>;
  timestamp: string;
}

export interface AgentBehaviorSummary {
  total_actions: number;
  blocked_actions: number;
  hitl_escalations: number;
  anomalies: number;
  incidents: number;
}

export interface AgentBehaviorResult {
  agent: Record<string, unknown>;
  events: AgentTimelineEvent[];
  summary: AgentBehaviorSummary;
}

/* extend agents namespace */
export const agentBehavior = {
  getTimeline: (agentId: string, params?: { start?: string; end?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.start)  q.set('start', params.start);
    if (params?.end)    q.set('end', params.end);
    if (params?.limit)  q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<AgentBehaviorResult>(`/agents/${agentId}/behavior${qs ? '?' + qs : ''}`);
  },

  getEvidence: (agentId: string) =>
    apiFetch<{ contributions: Array<{ report_id: string; report_type: string; generated_at: string; regulation: string }> }>(`/agents/${agentId}/evidence`),

  classify: (agentId: string) =>
    apiFetch<{ eu_ai_act_category: string; confidence: string; reasoning: string }>(`/agents/${agentId}/classification`, { method: 'POST' }),

  suspend: (agentId: string, reason?: string) =>
    apiFetch<{ success: boolean }>(`/agents/${agentId}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

/* ─── Controls ───────────────────────────────────────────────────────── */
export type ControlStatus   = 'passing' | 'failing' | 'warning' | 'not_evaluated';
export type ControlSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EvaluationType  = 'real_time' | 'scheduled' | 'manual';

export interface Control {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  regulation: string | null;
  clause_ref: string | null;
  policy_id: string | null;
  evaluation_type: EvaluationType;
  evaluation_query: unknown | null;
  evaluation_schedule: string | null;
  status: ControlStatus;
  last_evaluated_at: string | null;
  consecutive_failures: number;
  severity: ControlSeverity;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface ControlStatusSummary {
  total: number;
  passing: number;
  failing: number;
  warning: number;
  not_evaluated: number;
  by_regulation: Record<string, { passing: number; failing: number; warning: number }>;
  recent_failures?: Array<{ control_id: string; evaluated_at: string; detail: Record<string, unknown>; control?: Control }>;
}

export const controls = {
  list: (params?: { status?: ControlStatus; regulation?: string; severity?: ControlSeverity; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status)     q.set('status', params.status);
    if (params?.regulation) q.set('regulation', params.regulation);
    if (params?.severity)   q.set('severity', params.severity);
    if (params?.limit)      q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<{ controls: Control[]; total: number }>(`/controls${qs ? '?' + qs : ''}`);
  },

  status: () =>
    apiFetch<ControlStatusSummary>('/controls/status'),

  evaluate: (id: string) =>
    apiFetch<{ result: string; detail: Record<string, unknown> }>(`/controls/${id}/evaluate`, { method: 'POST' }),

  seed: () =>
    apiFetch<{ seeded: number; controls: Control[] }>('/controls/seed', { method: 'POST' }),

  create: (body: { name: string; description?: string; regulation?: string; clause_ref?: string; evaluation_type?: EvaluationType; severity?: ControlSeverity; owner?: string }) =>
    apiFetch<Control>('/controls', { method: 'POST', body: JSON.stringify(body) }),
};

/* ─── Evidence Packs ─────────────────────────────────────────────────── */
export interface EvidencePack {
  id: string;
  tenant_id: string;
  pack_name: string;
  regulation: string;
  pack_type: string;
  status: 'generating' | 'ready' | 'failed';
  coverage_score: number;
  clauses_covered: number;
  clauses_total: number;
  agent_ids: string[];
  date_from: string;
  date_to: string;
  manifest_hash: string;
  signature: string;
  signed_at: string;
  signer_key_id: string;
  evidence_manifest: Record<string, unknown>;
  gaps: Array<{ hint: string }>;
  template_id: string | null;
  notified_body: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const evidencePacks = {
  list: (params?: { regulation?: string; pack_type?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.regulation) q.set('regulation', params.regulation);
    if (params?.pack_type)  q.set('pack_type', params.pack_type);
    if (params?.status)     q.set('status', params.status);
    if (params?.limit)      q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<{ packs: EvidencePack[]; total: number }>(`/evidence/packs${qs ? '?' + qs : ''}`);
  },

  generate: (body: { regulation: string; pack_type?: string; template_id?: string; agent_ids?: string[]; date_from?: string; date_to?: string; pack_name?: string; created_by?: string }) =>
    apiFetch<{ pack: EvidencePack }>('/evidence/packs', { method: 'POST', body: JSON.stringify(body) }),

  getById: (id: string) =>
    apiFetch<{ pack: EvidencePack }>(`/evidence/packs/${id}`),

  export: (id: string, format: string) =>
    apiFetch<{ export: Record<string, unknown>; format: string }>(`/evidence/packs/${id}/export`, { method: 'POST', body: JSON.stringify({ format }) }),
};

/* ─── Decision Ledger / Outcomes ─────────────────────────────────────── */
export interface DecisionOutcome {
  id: string;
  tenant_id: string;
  decision_id: string;
  decision_type: string | null;
  outcome_status: 'accepted' | 'rejected' | 'reversed' | 'litigated' | 'settled' | 'pending';
  outcome_source: string | null;
  source_ref: string | null;
  source_url: string | null;
  label_notes: string | null;
  labeled_by: string | null;
  labeled_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const decisionLedger = {
  listOutcomes: (params?: { decision_id?: string; outcome_status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.decision_id)    q.set('decision_id', params.decision_id);
    if (params?.outcome_status) q.set('outcome_status', params.outcome_status);
    if (params?.limit)          q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<{ outcomes: DecisionOutcome[]; total: number }>(`/ledger/outcomes${qs ? '?' + qs : ''}`);
  },

  labelOutcome: (body: { decision_id: string; outcome_status: string; outcome_source?: string; source_ref?: string; source_url?: string; label_notes?: string; labeled_by?: string; metadata?: Record<string, unknown> }) =>
    apiFetch<{ outcome: DecisionOutcome }>('/ledger/outcomes', { method: 'POST', body: JSON.stringify(body) }),

  replay: (decisionId: string) =>
    apiFetch<{ replay: Record<string, unknown> }>(`/ledger/replay/${decisionId}`, { method: 'POST', body: '{}' }),
};

/* ─── Agent Passport Registry ────────────────────────────────────────── */
export interface AgentPassport {
  id: string;
  tenant_id: string;
  agent_id: string;
  passport_number: string;
  status: 'active' | 'suspended' | 'revoked';
  agent_name: string;
  agent_type: string | null;
  framework: string;
  capabilities: string[];
  risk_tier: string;
  eu_ai_act_category: string | null;
  reputation_score: number;
  incident_count: number;
  anomaly_count: number;
  signature: string;
  signed_at: string;
  valid_from: string;
  valid_to: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  public: boolean;
  created_at: string;
  updated_at: string;
}

export const registry = {
  list: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.limit)  q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<{ passports: AgentPassport[]; total: number }>(`/registry/passports${qs ? '?' + qs : ''}`);
  },

  browse: () =>
    apiFetch<{ passports: AgentPassport[]; total: number }>('/registry/passports?browse=true'),

  issue: (body: { agent_id: string; agent_name: string; agent_type?: string; framework?: string; capabilities?: string[]; risk_tier?: string; eu_ai_act_category?: string; valid_days?: number; public?: boolean }) =>
    apiFetch<{ passport: AgentPassport }>('/registry/passports', { method: 'POST', body: JSON.stringify(body) }),

  getById: (id: string) =>
    apiFetch<{ passport: AgentPassport }>(`/registry/passports/${id}`),

  verify: (id: string) =>
    apiFetch<{ verification: { passport_id: string; passport_number: string; agent_name: string; result: string; valid: boolean; risk_tier: string; reputation_score: number; verified_at: string } }>(`/registry/passports/${id}/verify`, { method: 'POST', body: '{}' }),

  revoke: (id: string, reason?: string) =>
    apiFetch<{ passport: AgentPassport }>(`/registry/passports/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

/* ─── Health (outside /v1 prefix — no tenant required) ──────────────── */
export async function checkHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.json() as Promise<{ status: string; timestamp: string; version: string }>;
}
