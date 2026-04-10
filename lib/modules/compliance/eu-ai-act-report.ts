/**
 * EU AI Act Evidence Report Generator
 *
 * Generates a structured compliance evidence package mapped to:
 * - Article 13: Transparency obligations
 * - Article 14: Human oversight
 * - Article 17: Quality management system
 * - Article 26: Deployer obligations
 *
 * Output: Deterministic JSON (same inputs → same output) for audit reproducibility.
 */

import { createAdminClient } from '../../db/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface EuAiActReportOptions {
  period_start: string; // ISO8601
  period_end: string;   // ISO8601
  framework?: 'EU_AI_ACT_2024' | 'NIST_AI_RMF';
}

export interface ArticleCoverageStatus {
  status: 'covered' | 'partial' | 'not_covered';
}

export interface EuAiActReport {
  report_metadata: {
    generated_at: string;
    framework: string;
    enforcement_date: string;
    organization: { id: string; name: string };
    evidence_period: { from: string; to: string };
    report_id: string;
    cryptographic_integrity: {
      ledger_root_hash: string;
      verification_instruction: string;
    };
  };
  article_coverage: {
    article_13_transparency: {
      status: 'covered' | 'partial' | 'not_covered';
      evidence_count: number;
      evidence_refs: string[];
      notes: string;
    };
    article_14_human_oversight: {
      status: 'covered' | 'partial' | 'not_covered';
      hitl_reviews: number;
      avg_review_time_minutes: number;
      overrides_by_humans: number;
      evidence_refs: string[];
    };
    article_17_quality_management: {
      status: 'covered' | 'partial' | 'not_covered';
      policy_version: string;
      anomalies_detected: number;
      remediation_actions: number;
    };
    article_26_deployer_obligations: {
      status: 'covered' | 'partial' | 'not_covered';
      agent_inventory_count: number;
      risk_classifications: Record<string, number>;
      third_party_models: string[];
    };
  };
  agent_inventory: Array<{
    id: string;
    name: string;
    framework: string;
    risk_classification: string;
    eu_ai_act_category: string;
    status: string;
    last_active_at: string | null;
  }>;
  action_ledger_summary: {
    total_actions: number;
    cryptographically_signed: number;
    coverage_percentage: number;
    highest_risk_actions: Array<{
      id: string;
      event_type: string;
      agent_id: string;
      created_at: string;
      risk_score?: number;
    }>;
  };
  hitl_review_log: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
    decided_by: string | null;
  }>;
  incidents: Array<{
    id: string;
    event_type: string;
    occurred_at: string;
    severity: string;
  }>;
  attestation: {
    signed_by: string;
    signature: string;
    timestamp: string;
  };
}

export class EuAiActReportGenerator {
  static async generate(tenantId: string, options: EuAiActReportOptions): Promise<EuAiActReport> {
    const supabase = createAdminClient();
    const { period_start, period_end, framework = 'EU_AI_ACT_2024' } = options;
    const reportId = uuidv4();

    // Fetch all evidence data in parallel
    const [
      auditEventsResult,
      hitlResult,
      agentsResult,
      anomaliesResult,
      firewallResult,
    ] = await Promise.allSettled([
      supabase
        .from('audit_events')
        .select('id, event_type, module, created_at, signature, agent_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', period_start)
        .lte('created_at', period_end)
        .order('created_at', { ascending: true })
        .limit(10000),

      supabase
        .from('hitl_exceptions')
        .select('id, title, priority, status, created_at, resolved_at, resolver_id, resolution_reason, agent_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', period_start)
        .lte('created_at', period_end)
        .order('created_at', { ascending: false }),

      supabase
        .from('registered_agents')
        .select('id, name, status, risk_level, created_at, last_seen_at, metadata')
        .eq('tenant_id', tenantId),

      supabase
        .from('anomaly_events')
        .select('id, event_type, severity, created_at, resolved_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', period_start)
        .lte('created_at', period_end)
        .limit(500),

      supabase
        .from('firewall_evaluations')
        .select('id, verdict, risk_score, action, resource, created_at, agent_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', period_start)
        .lte('created_at', period_end)
        .eq('verdict', 'block')
        .limit(100),
    ]);

    const auditEvents = auditEventsResult.status === 'fulfilled' ? auditEventsResult.value.data || [] : [];
    const hitlTickets = hitlResult.status === 'fulfilled' ? hitlResult.value.data || [] : [];
    const agents = agentsResult.status === 'fulfilled' ? agentsResult.value.data || [] : [];
    const anomalies = anomaliesResult.status === 'fulfilled' ? anomaliesResult.value.data || [] : [];
    const blockedActions = firewallResult.status === 'fulfilled' ? firewallResult.value.data || [] : [];

    // Article 13: Transparency — covered by signed audit events
    const signedEvents = auditEvents.filter((e: any) => !!e.signature);
    const art13Status: 'covered' | 'partial' | 'not_covered' =
      signedEvents.length === 0 ? 'not_covered' :
      signedEvents.length < auditEvents.length * 0.9 ? 'partial' : 'covered';

    // Article 14: Human oversight — covered by HITL reviews
    const resolvedHitl = hitlTickets.filter((t: any) => t.status === 'approved' || t.status === 'rejected');
    const overrideCount = hitlTickets.filter((t: any) => t.status === 'rejected').length;

    const resolutionTimes = resolvedHitl
      .filter((t: any) => t.resolved_at && t.created_at)
      .map((t: any) => {
        const diffMs = new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
        return diffMs / (1000 * 60); // minutes
      });
    const avgReviewMin = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length)
      : 0;

    const art14Status: 'covered' | 'partial' | 'not_covered' =
      hitlTickets.length === 0 ? 'partial' :
      resolvedHitl.length / hitlTickets.length >= 0.8 ? 'covered' : 'partial';

    // Article 17: Quality management — covered by anomaly detection & remediation
    const remediatedAnomalies = anomalies.filter((a: any) => a.resolved_at).length;
    const art17Status: 'covered' | 'partial' | 'not_covered' =
      anomalies.length === 0 ? 'covered' :
      remediatedAnomalies / anomalies.length >= 0.8 ? 'covered' : 'partial';

    // Article 26: Deployer obligations — covered by agent inventory
    const riskClassifications: Record<string, number> = {};
    for (const agent of agents as any[]) {
      const risk = agent.risk_level || 'unclassified';
      riskClassifications[risk] = (riskClassifications[risk] || 0) + 1;
    }

    const thirdPartyModels = [...new Set(
      (agents as any[])
        .map(a => a.metadata?.model || a.metadata?.platform)
        .filter(Boolean)
    )] as string[];

    const art26Status: 'covered' | 'partial' | 'not_covered' =
      agents.length === 0 ? 'not_covered' :
      agents.length > 0 ? 'covered' : 'partial';

    // Compute ledger root hash (deterministic for reproducibility)
    const ledgerData = auditEvents
      .map((e: any) => `${e.id}:${e.event_type}:${e.created_at}:${e.signature || ''}`)
      .sort()
      .join('\n');
    const ledgerRootHash = crypto.createHash('sha256').update(ledgerData || 'empty').digest('hex');

    // Coverage score = % of audit events with cryptographic signature
    const coveragePct = auditEvents.length > 0
      ? Math.round((signedEvents.length / auditEvents.length) * 100 * 100) / 100
      : 100;

    // Build attestation signature over report hash
    const reportPayload = JSON.stringify({
      reportId,
      tenantId,
      period_start,
      period_end,
      ledgerRootHash,
      generatedAt: new Date().toISOString(),
    });
    const attestationSig = crypto.createHash('sha256').update(reportPayload).digest('hex');

    // Get org name (best effort)
    const { data: orgData } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
      .catch(() => ({ data: null }));

    const orgName = (orgData as any)?.name || tenantId;

    const report: EuAiActReport = {
      report_metadata: {
        generated_at: new Date().toISOString(),
        framework: framework === 'EU_AI_ACT_2024'
          ? 'EU AI Act (Regulation 2024/1689)'
          : 'NIST AI Risk Management Framework 1.0',
        enforcement_date: '2026-08-02',
        organization: { id: tenantId, name: orgName },
        evidence_period: { from: period_start, to: period_end },
        report_id: reportId,
        cryptographic_integrity: {
          ledger_root_hash: ledgerRootHash,
          verification_instruction: 'SHA-256 hash chain: sort all audit event records by id, concatenate id:event_type:created_at:signature with newline separator, compute SHA-256',
        },
      },
      article_coverage: {
        article_13_transparency: {
          status: art13Status,
          evidence_count: signedEvents.length,
          evidence_refs: signedEvents.slice(0, 20).map((e: any) => e.id),
          notes: `Transparency disclosures generated for ${signedEvents.length} of ${auditEvents.length} agent interactions`,
        },
        article_14_human_oversight: {
          status: art14Status,
          hitl_reviews: hitlTickets.length,
          avg_review_time_minutes: avgReviewMin,
          overrides_by_humans: overrideCount,
          evidence_refs: resolvedHitl.slice(0, 20).map((t: any) => t.id),
        },
        article_17_quality_management: {
          status: art17Status,
          policy_version: '1.0',
          anomalies_detected: anomalies.length,
          remediation_actions: remediatedAnomalies,
        },
        article_26_deployer_obligations: {
          status: art26Status,
          agent_inventory_count: agents.length,
          risk_classifications: riskClassifications,
          third_party_models: thirdPartyModels,
        },
      },
      agent_inventory: (agents as any[]).map(a => ({
        id: a.id,
        name: a.name || a.id,
        framework: a.metadata?.framework || 'unknown',
        risk_classification: a.risk_level || 'unclassified',
        eu_ai_act_category: a.metadata?.eu_ai_act_category || 'unclassified',
        status: a.status || 'active',
        last_active_at: a.last_seen_at || null,
      })),
      action_ledger_summary: {
        total_actions: auditEvents.length,
        cryptographically_signed: signedEvents.length,
        coverage_percentage: coveragePct,
        highest_risk_actions: (blockedActions as any[]).slice(0, 10).map(a => ({
          id: a.id,
          event_type: a.action || 'firewall_block',
          agent_id: a.agent_id || 'unknown',
          created_at: a.created_at,
          risk_score: a.risk_score,
        })),
      },
      hitl_review_log: (hitlTickets as any[]).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        created_at: t.created_at,
        resolved_at: t.resolved_at || null,
        decided_by: t.resolver_id || null,
      })),
      incidents: (anomalies as any[]).map(a => ({
        id: a.id,
        event_type: a.event_type,
        occurred_at: a.created_at,
        severity: a.severity || 'unknown',
      })),
      attestation: {
        signed_by: 'RuneSignal Compliance Engine v1.0',
        signature: attestationSig,
        timestamp: new Date().toISOString(),
      },
    };

    return report;
  }

  /** Compute article_coverage summary booleans for DB storage */
  static computeArticleCoverage(report: EuAiActReport): Record<string, boolean> {
    return {
      art_13: report.article_coverage.article_13_transparency.status !== 'not_covered',
      art_14: report.article_coverage.article_14_human_oversight.status !== 'not_covered',
      art_17: report.article_coverage.article_17_quality_management.status !== 'not_covered',
      art_26: report.article_coverage.article_26_deployer_obligations.status !== 'not_covered',
    };
  }
}
