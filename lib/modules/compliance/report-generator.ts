/**
 * RuneSignal Compliance Report Generator
 *
 * Generates point-in-time compliance evidence reports covering:
 * - SOC 2 Type II evidence (audit trail, access controls, change management)
 * - HITL oversight trail (human-in-the-loop decision log)
 * - Policy violation summaries
 * - Agent activity statistics
 * - Ed25519 signature verification status
 */

import { createAdminClient } from '../../db/supabase';

export interface ReportOptions {
  from: string; // ISO date
  to: string;   // ISO date
  framework?: 'soc2' | 'hipaa' | 'gdpr' | 'pci-dss' | 'general';
  format?: 'json' | 'summary';
}

export interface ComplianceReport {
  id: string;
  tenant_id: string;
  generated_at: string;
  period: { from: string; to: string };
  framework: string;

  summary: {
    total_audit_events: number;
    signed_events: number;
    signature_coverage_pct: number;
    total_agents: number;
    active_agents: number;
    policy_violations: number;
    hitl_tickets_created: number;
    hitl_tickets_resolved: number;
    hitl_resolution_rate_pct: number;
    firewall_evaluations: number;
    firewall_blocks: number;
    firewall_block_rate_pct: number;
  };

  audit_trail: {
    events_by_module: Record<string, number>;
    events_by_day: { date: string; count: number }[];
    top_event_types: { event_type: string; count: number }[];
  };

  hitl_trail: {
    tickets: {
      id: string;
      title: string;
      priority: string;
      status: string;
      created_at: string;
      resolved_at: string | null;
      reviewer_id: string | null;
      resolution_note: string | null;
    }[];
    avg_resolution_hours: number | null;
    overdue_tickets: number;
  };

  policy_violations: {
    agent_id: string;
    action: string;
    resource: string | null;
    verdict: string;
    risk_score: number;
    reasons: string[];
    occurred_at: string;
  }[];

  installed_policy_packs: {
    name: string;
    category: string;
    tier_required: string;
    installed_at: string;
    policies_count: number;
  }[];
}

export class ComplianceReportGenerator {
  static async generate(tenantId: string, options: ReportOptions): Promise<ComplianceReport> {
    const supabase = createAdminClient();
    const { from, to, framework = 'general' } = options;

    const toDate = to || new Date().toISOString();
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      auditEventsResult,
      hitlResult,
      firewallResult,
      agentsResult,
      policyPacksResult,
    ] = await Promise.allSettled([
      supabase
        .from('audit_events')
        .select('id, event_type, module, created_at, signature, agent_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: true })
        .limit(10000),

      supabase
        .from('hitl_exceptions')
        .select('id, title, priority, status, created_at, resolved_at, reviewer_id, resolution_note')
        .eq('tenant_id', tenantId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false }),

      supabase
        .from('firewall_evaluations')
        .select('id, verdict, risk_score, reasons, action, resource, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate),

      supabase
        .from('registered_agents')
        .select('id, status')
        .eq('tenant_id', tenantId),

      supabase
        .from('tenant_policy_packs')
        .select('installed_at, policy_packs(name, category, tier_required, policies)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true),
    ]);

    const auditEvents =
      auditEventsResult.status === 'fulfilled' ? auditEventsResult.value.data || [] : [];
    const hitlTickets =
      hitlResult.status === 'fulfilled' ? hitlResult.value.data || [] : [];
    const firewallEvals =
      firewallResult.status === 'fulfilled' ? firewallResult.value.data || [] : [];
    const agents =
      agentsResult.status === 'fulfilled' ? agentsResult.value.data || [] : [];
    const policyPacks =
      policyPacksResult.status === 'fulfilled' ? policyPacksResult.value.data || [] : [];

    // ── Summary calculations ──────────────────────────────────────────────────
    const signedEvents = auditEvents.filter(e => !!e.signature).length;
    const signatureCoverage =
      auditEvents.length > 0
        ? Math.round((signedEvents / auditEvents.length) * 100)
        : 100;

    const resolvedTickets = hitlTickets.filter(
      t => t.status === 'approved' || t.status === 'rejected'
    );
    const hitlResolutionRate =
      hitlTickets.length > 0
        ? Math.round((resolvedTickets.length / hitlTickets.length) * 100)
        : 100;

    const firewallBlocks = firewallEvals.filter(e => e.verdict === 'block');
    const firewallBlockRate =
      firewallEvals.length > 0
        ? Math.round((firewallBlocks.length / firewallEvals.length) * 100)
        : 0;

    // Count policy violations from firewall evaluations
    const violations = firewallEvals.filter(
      e => e.verdict === 'block' || e.verdict === 'escalate'
    );

    // ── Audit trail analytics ─────────────────────────────────────────────────
    const eventsByModule: Record<string, number> = {};
    const eventsByDay: Record<string, number> = {};
    const eventTypeCounts: Record<string, number> = {};

    for (const e of auditEvents) {
      eventsByModule[e.module] = (eventsByModule[e.module] || 0) + 1;
      const day = (e.created_at as string).slice(0, 10);
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
      eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1;
    }

    const topEventTypes = Object.entries(eventTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([event_type, count]) => ({ event_type, count }));

    const eventsByDayArray = Object.entries(eventsByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    // ── HITL resolution time ──────────────────────────────────────────────────
    const resolutionTimes = resolvedTickets
      .filter(t => t.resolved_at && t.created_at)
      .map(t => {
        const created = new Date(t.created_at as string).getTime();
        const resolved = new Date(t.resolved_at as string).getTime();
        return (resolved - created) / (1000 * 60 * 60); // hours
      });

    const avgResolutionHours =
      resolutionTimes.length > 0
        ? Math.round(
            (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) * 10
          ) / 10
        : null;

    const now = new Date();
    const overdueTickets = hitlTickets.filter(t => {
      if (t.status === 'approved' || t.status === 'rejected') return false;
      const created = new Date(t.created_at as string);
      const hoursSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation > 24; // SLA: 24 hours
    }).length;

    // ── Policy packs ──────────────────────────────────────────────────────────
    const installedPacks = (policyPacks as any[]).map(row => {
      const pack = row.policy_packs as any;
      return {
        name: pack?.name || '',
        category: pack?.category || '',
        tier_required: pack?.tier_required || '',
        installed_at: row.installed_at,
        policies_count: Array.isArray(pack?.policies) ? pack.policies.length : 0,
      };
    });

    const report: ComplianceReport = {
      id: `rpt_${Date.now()}`,
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      period: { from: fromDate, to: toDate },
      framework,

      summary: {
        total_audit_events: auditEvents.length,
        signed_events: signedEvents,
        signature_coverage_pct: signatureCoverage,
        total_agents: agents.length,
        active_agents: agents.filter(a => a.status === 'active').length,
        policy_violations: violations.length,
        hitl_tickets_created: hitlTickets.length,
        hitl_tickets_resolved: resolvedTickets.length,
        hitl_resolution_rate_pct: hitlResolutionRate,
        firewall_evaluations: firewallEvals.length,
        firewall_blocks: firewallBlocks.length,
        firewall_block_rate_pct: firewallBlockRate,
      },

      audit_trail: {
        events_by_module: eventsByModule,
        events_by_day: eventsByDayArray,
        top_event_types: topEventTypes,
      },

      hitl_trail: {
        tickets: (hitlTickets as any[]).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          created_at: t.created_at,
          resolved_at: t.resolved_at,
          reviewer_id: t.reviewer_id,
          resolution_note: t.resolution_note,
        })),
        avg_resolution_hours: avgResolutionHours,
        overdue_tickets: overdueTickets,
      },

      policy_violations: violations.map(e => ({
        agent_id: (e as any).agent_id || '',
        action: (e as any).action || '',
        resource: (e as any).resource || null,
        verdict: (e as any).verdict,
        risk_score: (e as any).risk_score || 0,
        reasons: Array.isArray((e as any).reasons) ? (e as any).reasons : [],
        occurred_at: (e as any).created_at,
      })),

      installed_policy_packs: installedPacks,
    };

    return report;
  }
}
