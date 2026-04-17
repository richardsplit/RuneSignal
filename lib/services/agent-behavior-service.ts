/**
 * AgentBehaviorService — Merged agent timeline across all event subsystems.
 *
 * Fan-out queries: audit_events, firewall_evaluations, hitl_exceptions,
 * anomaly_events, incidents — filtered by agent_id, merged and sorted.
 *
 * EU AI Act Article 13 — Transparency & Traceability
 * ISO 42001 Clause 8.5 — Human Oversight Logs
 *
 * Phase 5 Task 5.1.1
 */

import { createAdminClient } from '@lib/db/supabase';
import type {
  AgentTimelineEvent,
  AgentBehaviorSummary,
  AgentTimelineResult,
  AgentEvidenceContribution,
} from '@lib/types/agent-behavior';

export class AgentBehaviorService {
  /**
   * Get merged timeline of all events for an agent across all subsystems.
   * Fan-out query to audit_events, firewall_evaluations, hitl_exceptions,
   * anomaly_events, incidents — filtered by agent_id. Merge and sort by timestamp.
   */
  static async getAgentTimeline(
    tenant_id: string,
    agent_id: string,
    params?: {
      start?: string;
      end?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<AgentTimelineResult> {
    const supabase = createAdminClient();
    const limit = params?.limit ?? 100;
    const offset = params?.offset ?? 0;
    // Fetch more per-source than final limit to account for merge pagination
    const perSourceLimit = limit * 2;

    // 1. Load agent info from agent_credentials
    const { data: agent, error: agentError } = await supabase
      .from('agent_credentials')
      .select('*')
      .eq('id', agent_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    // 2. Fan-out queries in parallel — each wrapped to handle missing tables gracefully
    const [auditEvents, firewallEvents, hitlEvents, anomalyEvents, incidentEvents] =
      await Promise.all([
        AgentBehaviorService._queryAudit(supabase, tenant_id, agent_id, params?.start, params?.end, perSourceLimit),
        AgentBehaviorService._queryFirewall(supabase, tenant_id, agent_id, params?.start, params?.end, perSourceLimit),
        AgentBehaviorService._queryHitl(supabase, tenant_id, agent_id, params?.start, params?.end, perSourceLimit),
        AgentBehaviorService._queryAnomaly(supabase, tenant_id, agent_id, params?.start, params?.end, perSourceLimit),
        AgentBehaviorService._queryIncidents(supabase, tenant_id, agent_id, params?.start, params?.end, perSourceLimit),
      ]);

    // 3. Merge and sort by timestamp descending
    const allEvents: AgentTimelineEvent[] = [
      ...auditEvents,
      ...firewallEvents,
      ...hitlEvents,
      ...anomalyEvents,
      ...incidentEvents,
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 4. Apply pagination after merge
    const paginatedEvents = allEvents.slice(offset, offset + limit);

    // 5. Build summary from ALL events (not just paginated)
    const summary: AgentBehaviorSummary = {
      total_actions: auditEvents.length,
      blocked_actions: firewallEvents.filter(
        (e) => (e.event as Record<string, unknown>).verdict === 'block',
      ).length,
      hitl_escalations: hitlEvents.length,
      anomalies: anomalyEvents.length,
      incidents: incidentEvents.length,
    };

    return {
      agent: agent as Record<string, unknown>,
      events: paginatedEvents,
      summary,
    };
  }

  /**
   * Get which evidence bundles (compliance_reports) include this agent.
   * Uses text search on json_export for the agent_id value.
   */
  static async getAgentEvidenceContribution(
    tenant_id: string,
    agent_id: string,
  ): Promise<AgentEvidenceContribution[]> {
    const supabase = createAdminClient();

    try {
      // compliance_reports uses org_id (not tenant_id)
      const { data, error } = await supabase
        .from('compliance_reports')
        .select('id, report_type, generated_at, regulation')
        .eq('org_id', tenant_id)
        .like('json_export::text', `%${agent_id}%`);

      if (error) {
        console.warn('[AgentBehaviorService] compliance_reports query failed:', error.message);
        return [];
      }

      return (data ?? []).map((row) => ({
        report_id: row.id,
        report_type: row.report_type,
        generated_at: row.generated_at,
        regulation: row.regulation,
      }));
    } catch (err) {
      console.warn('[AgentBehaviorService] Failed to query compliance_reports:', err);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Private fan-out query helpers — each handles missing tables gracefully
  // ---------------------------------------------------------------------------

  private static async _queryAudit(
    supabase: ReturnType<typeof createAdminClient>,
    tenant_id: string,
    agent_id: string,
    start?: string,
    end?: string,
    perLimit?: number,
  ): Promise<AgentTimelineEvent[]> {
    try {
      let query = supabase
        .from('audit_events')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(perLimit ?? 200);

      if (start) query = query.gte('created_at', start);
      if (end) query = query.lte('created_at', end);

      const { data, error } = await query;
      if (error) {
        console.warn('[AgentBehaviorService] audit_events query failed:', error.message);
        return [];
      }
      return (data ?? []).map((row) => ({
        source: 'audit' as const,
        event: row as Record<string, unknown>,
        timestamp: row.created_at,
      }));
    } catch (err) {
      console.warn('[AgentBehaviorService] audit_events unavailable:', err);
      return [];
    }
  }

  private static async _queryFirewall(
    supabase: ReturnType<typeof createAdminClient>,
    tenant_id: string,
    agent_id: string,
    start?: string,
    end?: string,
    perLimit?: number,
  ): Promise<AgentTimelineEvent[]> {
    try {
      let query = supabase
        .from('firewall_evaluations')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(perLimit ?? 200);

      if (start) query = query.gte('created_at', start);
      if (end) query = query.lte('created_at', end);

      const { data, error } = await query;
      if (error) {
        console.warn('[AgentBehaviorService] firewall_evaluations query failed:', error.message);
        return [];
      }
      return (data ?? []).map((row) => ({
        source: 'firewall' as const,
        event: row as Record<string, unknown>,
        timestamp: row.created_at,
      }));
    } catch (err) {
      console.warn('[AgentBehaviorService] firewall_evaluations unavailable:', err);
      return [];
    }
  }

  private static async _queryHitl(
    supabase: ReturnType<typeof createAdminClient>,
    tenant_id: string,
    agent_id: string,
    start?: string,
    end?: string,
    perLimit?: number,
  ): Promise<AgentTimelineEvent[]> {
    try {
      let query = supabase
        .from('hitl_exceptions')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(perLimit ?? 200);

      if (start) query = query.gte('created_at', start);
      if (end) query = query.lte('created_at', end);

      const { data, error } = await query;
      if (error) {
        console.warn('[AgentBehaviorService] hitl_exceptions query failed:', error.message);
        return [];
      }
      return (data ?? []).map((row) => ({
        source: 'hitl' as const,
        event: row as Record<string, unknown>,
        timestamp: row.created_at,
      }));
    } catch (err) {
      console.warn('[AgentBehaviorService] hitl_exceptions unavailable:', err);
      return [];
    }
  }

  private static async _queryAnomaly(
    supabase: ReturnType<typeof createAdminClient>,
    tenant_id: string,
    agent_id: string,
    start?: string,
    end?: string,
    perLimit?: number,
  ): Promise<AgentTimelineEvent[]> {
    try {
      let query = supabase
        .from('anomaly_events')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(perLimit ?? 200);

      if (start) query = query.gte('created_at', start);
      if (end) query = query.lte('created_at', end);

      const { data, error } = await query;
      if (error) {
        console.warn('[AgentBehaviorService] anomaly_events query failed:', error.message);
        return [];
      }
      return (data ?? []).map((row) => ({
        source: 'anomaly' as const,
        event: row as Record<string, unknown>,
        timestamp: row.created_at,
      }));
    } catch (err) {
      console.warn('[AgentBehaviorService] anomaly_events unavailable:', err);
      return [];
    }
  }

  private static async _queryIncidents(
    supabase: ReturnType<typeof createAdminClient>,
    tenant_id: string,
    agent_id: string,
    start?: string,
    end?: string,
    perLimit?: number,
  ): Promise<AgentTimelineEvent[]> {
    try {
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('tenant_id', tenant_id)
        .contains('related_agent_ids', [agent_id])
        .order('created_at', { ascending: false })
        .limit(perLimit ?? 200);

      if (start) query = query.gte('created_at', start);
      if (end) query = query.lte('created_at', end);

      const { data, error } = await query;
      if (error) {
        console.warn('[AgentBehaviorService] incidents query failed:', error.message);
        return [];
      }
      return (data ?? []).map((row) => ({
        source: 'incident' as const,
        event: row as Record<string, unknown>,
        timestamp: row.created_at,
      }));
    } catch (err) {
      console.warn('[AgentBehaviorService] incidents unavailable:', err);
      return [];
    }
  }
}
