/**
 * Incident types for Phase 3 — Incident Management
 * EU AI Act Article 73 (Serious Incident Reporting)
 * ISO 42001 Clause 10.2 (Incident Documentation)
 */

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentCategory = 'operational' | 'safety' | 'rights_violation' | 'security' | 'compliance_gap';
export type IncidentStatus = 'detected' | 'investigating' | 'mitigated' | 'reported' | 'closed';

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
  corrective_actions: Array<{
    description: string;
    owner: string;
    deadline: string;
    status: 'pending' | 'done';
  }>;
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
