/**
 * IncidentService — Lifecycle management for compliance incidents.
 *
 * EU AI Act Article 73 — Serious Incident Reporting
 * ISO 42001 Clause 10.2 — Incident Documentation
 *
 * Phase 3 Task 3.1.2
 */

import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '@lib/ledger/service';
import { v4 as uuidv4 } from 'uuid';
import type {
  Incident,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEntry,
} from '@lib/types/incident';

/** Legal status transitions — no step skipping. */
const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus | null> = {
  detected: 'investigating',
  investigating: 'mitigated',
  mitigated: 'reported',
  reported: 'closed',
  closed: null,
};

/** Map target status → timestamp column to set on transition. */
const STATUS_TIMESTAMP_FIELD: Record<string, string> = {
  investigating: 'investigating_since',
  mitigated: 'mitigated_at',
  reported: 'reported_at',
  closed: 'closed_at',
};

export class IncidentService {
  /**
   * Create a new incident.
   * If is_serious_incident=true, auto-calculate art73_report_deadline as detected_at + 15 days.
   * Appends 'created' timeline entry. Logs Ed25519 audit event.
   */
  static async create(params: {
    tenant_id: string;
    title: string;
    description?: string;
    severity: IncidentSeverity;
    category: IncidentCategory;
    is_serious_incident?: boolean;
    market_surveillance_authority?: string;
    reported_by: string;
    related_anomaly_ids?: string[];
    related_hitl_ids?: string[];
    related_agent_ids?: string[];
    related_firewall_ids?: string[];
  }): Promise<Incident> {
    const supabase = createAdminClient();
    const id = uuidv4();
    const now = new Date();
    const detectedAt = now.toISOString();

    // Art 73: serious incidents must be reported within 15 calendar days
    let art73Deadline: string | null = null;
    if (params.is_serious_incident) {
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 15);
      art73Deadline = deadline.toISOString();
    }

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert({
        id,
        tenant_id: params.tenant_id,
        title: params.title,
        description: params.description || null,
        severity: params.severity,
        category: params.category,
        is_serious_incident: params.is_serious_incident || false,
        art73_report_deadline: art73Deadline,
        market_surveillance_authority: params.market_surveillance_authority || null,
        status: 'detected',
        detected_at: detectedAt,
        reported_by: params.reported_by,
        related_anomaly_ids: params.related_anomaly_ids || [],
        related_hitl_ids: params.related_hitl_ids || [],
        related_agent_ids: params.related_agent_ids || [],
        related_firewall_ids: params.related_firewall_ids || [],
        corrective_actions: [],
        created_at: detectedAt,
        updated_at: detectedAt,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create incident: ${error.message}`);

    // Timeline entry
    await IncidentService._addTimelineEntry(supabase, id, 'created', params.reported_by, {
      title: params.title,
      severity: params.severity,
      category: params.category,
      is_serious_incident: params.is_serious_incident || false,
    });

    // Audit ledger
    await AuditLedgerService.appendEvent({
      event_type: 'incident.created',
      module: 'system',
      tenant_id: params.tenant_id,
      request_id: id,
      payload: {
        incident_id: id,
        title: params.title,
        severity: params.severity,
        category: params.category,
        is_serious_incident: params.is_serious_incident || false,
        art73_report_deadline: art73Deadline,
      },
    });

    return incident as Incident;
  }

  /**
   * Transition incident status. Validates the transition is legal (no step skipping).
   * Sets the corresponding timestamp field. Appends timeline + audit event.
   */
  static async transition(
    tenant_id: string,
    incident_id: string,
    to_status: IncidentStatus,
    actor: string,
    detail?: Record<string, unknown>,
  ): Promise<Incident> {
    const supabase = createAdminClient();

    // Fetch current status
    const { data: current, error: fetchError } = await supabase
      .from('incidents')
      .select('status')
      .eq('id', incident_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (fetchError || !current) throw new Error('Incident not found');

    const currentStatus = current.status as IncidentStatus;
    if (VALID_TRANSITIONS[currentStatus] !== to_status) {
      throw new Error(
        `Invalid transition: cannot move from '${currentStatus}' to '${to_status}'. ` +
        `Expected next status: '${VALID_TRANSITIONS[currentStatus] || 'none (already closed)'}'.`,
      );
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, unknown> = {
      status: to_status,
      updated_at: now,
    };

    const tsField = STATUS_TIMESTAMP_FIELD[to_status];
    if (tsField) {
      updateFields[tsField] = now;
    }

    const { data: updated, error: updateError } = await supabase
      .from('incidents')
      .update(updateFields)
      .eq('id', incident_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to transition incident: ${updateError.message}`);

    // Timeline entry
    await IncidentService._addTimelineEntry(supabase, incident_id, 'status_changed', actor, {
      from: currentStatus,
      to: to_status,
      ...detail,
    });

    // Audit ledger
    await AuditLedgerService.appendEvent({
      event_type: 'incident.status_changed',
      module: 'system',
      tenant_id,
      request_id: incident_id,
      payload: {
        incident_id,
        from_status: currentStatus,
        to_status,
        actor,
        ...(detail || {}),
      },
    });

    return updated as Incident;
  }

  /**
   * Append a timeline entry (e.g., comments, evidence attached).
   */
  static async addTimelineEntry(
    incident_id: string,
    event_type: string,
    actor: string,
    detail: Record<string, unknown>,
  ): Promise<IncidentTimelineEntry> {
    const supabase = createAdminClient();
    return IncidentService._addTimelineEntry(supabase, incident_id, event_type, actor, detail);
  }

  /**
   * Assign an incident commander.
   */
  static async assignCommander(
    tenant_id: string,
    incident_id: string,
    commander_user_id: string,
  ): Promise<Incident> {
    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from('incidents')
      .update({
        incident_commander: commander_user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to assign commander: ${error.message}`);

    // Timeline entry
    await IncidentService._addTimelineEntry(supabase, incident_id, 'commander_assigned', commander_user_id, {
      commander_user_id,
    });

    // Audit ledger
    await AuditLedgerService.appendEvent({
      event_type: 'incident.commander_assigned',
      module: 'system',
      tenant_id,
      request_id: incident_id,
      payload: { incident_id, commander_user_id },
    });

    return updated as Incident;
  }

  /**
   * Add a corrective action to an incident.
   */
  static async addCorrectiveAction(
    tenant_id: string,
    incident_id: string,
    action: { description: string; owner: string; deadline: string },
  ): Promise<Incident> {
    const supabase = createAdminClient();

    // Fetch current corrective_actions
    const { data: current, error: fetchError } = await supabase
      .from('incidents')
      .select('corrective_actions')
      .eq('id', incident_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (fetchError || !current) throw new Error('Incident not found');

    const actions = Array.isArray(current.corrective_actions) ? current.corrective_actions : [];
    const newAction = { ...action, status: 'pending' };
    actions.push(newAction);

    const { data: updated, error: updateError } = await supabase
      .from('incidents')
      .update({
        corrective_actions: actions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to add corrective action: ${updateError.message}`);

    // Timeline entry
    await IncidentService._addTimelineEntry(supabase, incident_id, 'corrective_action_added', action.owner, {
      description: action.description,
      deadline: action.deadline,
    });

    // Audit ledger
    await AuditLedgerService.appendEvent({
      event_type: 'incident.corrective_action_added',
      module: 'system',
      tenant_id,
      request_id: incident_id,
      payload: { incident_id, action: newAction },
    });

    return updated as Incident;
  }

  /**
   * Get single incident by ID (tenant-scoped).
   */
  static async getById(tenant_id: string, incident_id: string): Promise<Incident | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incident_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error) return null;
    return data as Incident;
  }

  /**
   * List incidents with optional filters and pagination.
   */
  static async list(
    tenant_id: string,
    filters?: {
      status?: IncidentStatus;
      severity?: IncidentSeverity;
      is_serious_incident?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ incidents: Incident[]; total: number }> {
    const supabase = createAdminClient();
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.is_serious_incident !== undefined) {
      query = query.eq('is_serious_incident', filters.is_serious_incident);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`Failed to list incidents: ${error.message}`);

    return {
      incidents: (data || []) as Incident[],
      total: count ?? 0,
    };
  }

  /**
   * Auto-create incident from critical anomaly.
   * Sets reported_by: 'system:anomaly', links anomaly ID.
   */
  static async createFromAnomaly(
    tenant_id: string,
    anomaly_id: string,
    agent_id: string,
  ): Promise<Incident> {
    return IncidentService.create({
      tenant_id,
      title: `Critical anomaly detected: ${anomaly_id}`,
      description: `Auto-created incident from critical anomaly ${anomaly_id} on agent ${agent_id}.`,
      severity: 'critical',
      category: 'operational',
      is_serious_incident: false,
      reported_by: 'system:anomaly',
      related_anomaly_ids: [anomaly_id],
      related_agent_ids: [agent_id],
    });
  }

  /**
   * Get timeline entries for an incident, ordered by created_at.
   */
  static async getTimeline(
    incident_id: string,
    limit?: number,
    offset?: number,
  ): Promise<IncidentTimelineEntry[]> {
    const supabase = createAdminClient();

    let query = supabase
      .from('incident_timeline')
      .select('*')
      .eq('incident_id', incident_id)
      .order('created_at', { ascending: true });

    if (limit !== undefined) {
      const off = offset ?? 0;
      query = query.range(off, off + limit - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get timeline: ${error.message}`);
    return (data || []) as IncidentTimelineEntry[];
  }

  // ---------------------------------------------------------------------------
  // Internal helper
  // ---------------------------------------------------------------------------

  private static async _addTimelineEntry(
    supabase: ReturnType<typeof createAdminClient>,
    incident_id: string,
    event_type: string,
    actor: string,
    detail: Record<string, unknown>,
  ): Promise<IncidentTimelineEntry> {
    const { data, error } = await supabase
      .from('incident_timeline')
      .insert({
        id: uuidv4(),
        incident_id,
        event_type,
        actor,
        detail,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add timeline entry: ${error.message}`);
    return data as IncidentTimelineEntry;
  }
}
