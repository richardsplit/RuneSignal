/**
 * RuneSignal Node SDK — Incidents Resource
 * POST /api/v1/incidents
 */

import { BaseClient } from './client';

export type IncidentCategory =
  | 'data_breach'
  | 'policy_violation'
  | 'agent_misbehaviour'
  | 'bias_fairness'
  | 'availability'
  | 'third_party'
  | 'other';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus  = 'open' | 'investigating' | 'resolved' | 'closed';

export interface CreateIncidentRequest {
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  reportedBy: string;
  relatedAgentIds?: string[];
  isSeriousIncident?: boolean;
  regulatoryNotificationRequired?: boolean;
  idempotencyKey?: string;
}

export interface Incident {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedBy: string;
  relatedAgentIds: string[];
  isSeriousIncident: boolean;
  regulatoryNotificationRequired: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export class IncidentsResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Report a compliance incident or anomaly escalation.
   * Use idempotencyKey to safely retry without creating duplicates.
   *
   * @example
   * const incident = await client.incidents.create({
   *   title: 'Agent accessed PII outside declared scope',
   *   description: 'Agent agt-001 read customer addresses during a product lookup',
   *   category: 'data_breach',
   *   severity: 'high',
   *   reportedBy: 'agt-001',
   *   relatedAgentIds: ['agt-001'],
   *   isSeriousIncident: false,
   *   idempotencyKey: 'breach-agt001-2026-05',
   * });
   */
  async create(request: CreateIncidentRequest): Promise<Incident> {
    const headers: Record<string, string> = {};
    if (request.idempotencyKey) {
      headers['Idempotency-Key'] = request.idempotencyKey;
    }

    const raw: any = await (this.client as any).request('POST', '/api/v1/incidents', {
      body: {
        title: request.title,
        description: request.description,
        category: request.category,
        severity: request.severity,
        reported_by: request.reportedBy,
        related_agent_ids: request.relatedAgentIds,
        is_serious_incident: request.isSeriousIncident,
        regulatory_notification_required: request.regulatoryNotificationRequired,
        idempotency_key: request.idempotencyKey,
      },
    });

    return mapIncident(raw);
  }

  /** Get an incident by ID. */
  async get(incidentId: string): Promise<Incident> {
    const raw: any = await (this.client as any).request('GET', `/api/v1/incidents/${incidentId}`);
    return mapIncident(raw);
  }

  /** List recent incidents. */
  async list(options: { status?: IncidentStatus; severity?: IncidentSeverity; limit?: number } = {}): Promise<Incident[]> {
    const query: Record<string, string> = {};
    if (options.status)   query.status   = options.status;
    if (options.severity) query.severity = options.severity;
    if (options.limit)    query.limit    = String(options.limit);

    const raw: any[] = await (this.client as any).request('GET', '/api/v1/incidents', { query });
    return raw.map(mapIncident);
  }

  /** Update incident status. */
  async update(incidentId: string, patch: { status?: IncidentStatus; resolvedAt?: string }): Promise<Incident> {
    const raw: any = await (this.client as any).request('PATCH', `/api/v1/incidents/${incidentId}`, {
      body: { status: patch.status, resolved_at: patch.resolvedAt },
    });
    return mapIncident(raw);
  }
}

function mapIncident(raw: any): Incident {
  return {
    id:                             raw.id,
    tenantId:                       raw.tenant_id,
    title:                          raw.title,
    description:                    raw.description,
    category:                       raw.category,
    severity:                       raw.severity,
    status:                         raw.status,
    reportedBy:                     raw.reported_by,
    relatedAgentIds:                raw.related_agent_ids || [],
    isSeriousIncident:              raw.is_serious_incident,
    regulatoryNotificationRequired: raw.regulatory_notification_required,
    resolvedAt:                     raw.resolved_at,
    createdAt:                      raw.created_at,
  };
}
