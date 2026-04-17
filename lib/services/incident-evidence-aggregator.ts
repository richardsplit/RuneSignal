/**
 * IncidentEvidenceAggregator — Auto-collect related evidence on incident creation.
 *
 * Queries correlated events from anomaly_events, hitl_exceptions,
 * firewall_evaluations, and audit_events within a time window around
 * the incident's detected_at timestamp.
 *
 * EU AI Act Article 73 — Serious Incident Reporting (evidence collection)
 * ISO 42001 Clause 10.2 — Incident Documentation
 *
 * Phase 3 Task 3.3.1
 */

import { createAdminClient } from '@lib/db/supabase';
import { IncidentService } from '@lib/services/incident-service';

const ACTOR = 'system:evidence_aggregator';

/** Time window: detected_at - 24h to detected_at + 1h */
function getTimeWindow(detectedAt: string): { start: string; end: string } {
  const detected = new Date(detectedAt);
  const start = new Date(detected.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(detected.getTime() + 1 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export class IncidentEvidenceAggregator {
  /**
   * Aggregate evidence for an incident. Called after incident creation.
   * Queries related tables and adds timeline entries with evidence references.
   * Skips missing tables gracefully.
   */
  static async aggregate(
    tenant_id: string,
    incident_id: string,
  ): Promise<{
    anomaly_events: number;
    hitl_decisions: number;
    firewall_blocks: number;
    audit_events: number;
  }> {
    const supabase = createAdminClient();
    const counts = { anomaly_events: 0, hitl_decisions: 0, firewall_blocks: 0, audit_events: 0 };

    // Load the incident
    const incident = await IncidentService.getById(tenant_id, incident_id);
    if (!incident) {
      console.warn(`[EvidenceAggregator] Incident ${incident_id} not found`);
      return counts;
    }

    const { start, end } = getTimeWindow(incident.detected_at);

    // a. Anomaly events
    if (incident.related_anomaly_ids?.length) {
      try {
        const { data, error } = await supabase
          .from('anomaly_events')
          .select('id')
          .eq('tenant_id', tenant_id)
          .in('id', incident.related_anomaly_ids);

        if (!error && data?.length) {
          counts.anomaly_events = data.length;
          await IncidentService.addTimelineEntry(incident_id, 'evidence_attached', ACTOR, {
            source: 'anomaly_events',
            ids: data.map((r: { id: string }) => r.id),
            count: data.length,
          });
        }
      } catch (err) {
        console.warn('[EvidenceAggregator] anomaly_events query failed:', err);
      }
    }

    // b. HITL decisions
    if (incident.related_hitl_ids?.length) {
      try {
        const { data, error } = await supabase
          .from('hitl_exceptions')
          .select('id')
          .eq('tenant_id', tenant_id)
          .in('id', incident.related_hitl_ids);

        if (!error && data?.length) {
          counts.hitl_decisions = data.length;
          await IncidentService.addTimelineEntry(incident_id, 'evidence_attached', ACTOR, {
            source: 'hitl_exceptions',
            ids: data.map((r: { id: string }) => r.id),
            count: data.length,
          });
        }
      } catch (err) {
        console.warn('[EvidenceAggregator] hitl_exceptions query failed:', err);
      }
    }

    // c. Firewall blocks — by related_firewall_ids or related_agent_ids within time window
    const firewallAgentIds = incident.related_agent_ids?.length ? incident.related_agent_ids : [];
    if (incident.related_firewall_ids?.length || firewallAgentIds.length) {
      try {
        let query = supabase
          .from('firewall_evaluations')
          .select('id')
          .eq('tenant_id', tenant_id)
          .in('verdict', ['block', 'escalate'])
          .gte('created_at', start)
          .lte('created_at', end);

        if (firewallAgentIds.length) {
          query = query.in('agent_id', firewallAgentIds);
        }

        const { data, error } = await query;

        if (!error && data?.length) {
          counts.firewall_blocks = data.length;
          await IncidentService.addTimelineEntry(incident_id, 'evidence_attached', ACTOR, {
            source: 'firewall_evaluations',
            ids: data.map((r: { id: string }) => r.id),
            count: data.length,
          });
        }
      } catch (err) {
        console.warn('[EvidenceAggregator] firewall_evaluations query failed (table may not exist):', err);
      }
    }

    // d. Audit events — by related_agent_ids within time window
    if (incident.related_agent_ids?.length) {
      try {
        const { data, error } = await supabase
          .from('audit_events')
          .select('id')
          .eq('tenant_id', tenant_id)
          .in('agent_id', incident.related_agent_ids)
          .gte('created_at', start)
          .lte('created_at', end);

        if (!error && data?.length) {
          counts.audit_events = data.length;
          await IncidentService.addTimelineEntry(incident_id, 'evidence_attached', ACTOR, {
            source: 'audit_events',
            ids: data.map((r: { id: string }) => r.id),
            count: data.length,
          });
        }
      } catch (err) {
        console.warn('[EvidenceAggregator] audit_events query failed:', err);
      }
    }

    return counts;
  }
}
