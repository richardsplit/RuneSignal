/**
 * EvidenceService — Unified evidence bundle generation, retrieval, and listing.
 *
 * Delegates to EuAiActReportGenerator / Iso42001ReportGenerator for the actual
 * report generation, then wraps the result in the canonical EvidenceBundle type
 * with Ed25519 attestation and normalized coverage scoring.
 *
 * Phase 1 Task 1.1.2
 */

import crypto from 'crypto';
import { createAdminClient } from '@/lib/db/supabase';
import { getLedgerSigner } from '@lib/ledger/signer';
import { AuditLedgerService } from '@lib/ledger/service';
import {
  EuAiActReportGenerator,
  type EuAiActReport,
} from '@lib/modules/compliance/eu-ai-act-report';
import {
  Iso42001ReportGenerator,
  type Iso42001Report,
} from '@lib/modules/compliance/iso-42001-report';
import type {
  EvidenceBundle,
  Regulation,
  BundleCoverage,
  BundleAttestation,
  CoverageGap,
  ControlStatusSnapshot,
  HitlReceiptSnapshot,
} from '@lib/types/evidence-bundle';

// ---------------------------------------------------------------------------
// Coverage computation
// ---------------------------------------------------------------------------

function computeEuAiActCoverage(report: EuAiActReport): BundleCoverage {
  const ac = report.article_coverage;
  const clauseMap: Array<{ ref: string; status: string }> = [
    { ref: 'article_13', status: ac.article_13_transparency.status },
    { ref: 'article_14', status: ac.article_14_human_oversight.status },
    { ref: 'article_17', status: ac.article_17_quality_management.status },
    { ref: 'article_26', status: ac.article_26_deployer_obligations.status },
  ];

  const total = clauseMap.length;
  let covered = 0;
  let partial = 0;
  const gaps: CoverageGap[] = [];

  for (const c of clauseMap) {
    if (c.status === 'covered') {
      covered++;
    } else if (c.status === 'partial') {
      partial++;
      gaps.push({
        clause_ref: c.ref,
        status: 'partial',
        remediation_hint: 'Partial evidence exists. Review the evidence details for completeness.',
      });
    } else {
      gaps.push({
        clause_ref: c.ref,
        status: 'not_covered',
        remediation_hint: 'No evidence found for this clause. Ensure relevant events are being recorded.',
      });
    }
  }

  const overall_score = Math.round((covered * 100 + partial * 50) / total);

  return { overall_score, clauses_covered: covered, clauses_total: total, gaps };
}

function computeIso42001Coverage(report: Iso42001Report): BundleCoverage {
  const cc = report.clause_coverage;
  const clauseMap: Array<{ ref: string; status: string }> = [
    { ref: 'clause_6.1', status: cc.risk_management.status },
    { ref: 'clause_8.2', status: cc.technical_documentation.status },
    { ref: 'clause_8.5', status: cc.human_oversight_logs.status },
    { ref: 'clause_9.1', status: cc.accuracy_and_robustness.status },
    { ref: 'clause_10.2', status: cc.incident_documentation.status },
  ];

  const total = clauseMap.length;
  let covered = 0;
  let partial = 0;
  const gaps: CoverageGap[] = [];

  for (const c of clauseMap) {
    if (c.status === 'covered') {
      covered++;
    } else if (c.status === 'partial') {
      partial++;
      gaps.push({
        clause_ref: c.ref,
        status: 'partial',
        remediation_hint: 'Partial evidence exists. Review the evidence details for completeness.',
      });
    } else {
      gaps.push({
        clause_ref: c.ref,
        status: 'not_covered',
        remediation_hint: 'No evidence found for this clause. Ensure relevant events are being recorded.',
      });
    }
  }

  const overall_score = Math.round((covered * 100 + partial * 50) / total);

  return { overall_score, clauses_covered: covered, clauses_total: total, gaps };
}

// ---------------------------------------------------------------------------
// Attestation
// ---------------------------------------------------------------------------

function computeAttestation(
  manifest: EuAiActReport | Iso42001Report,
  controlStatus?: ControlStatusSnapshot,
): BundleAttestation {
  const hashInput = controlStatus
    ? JSON.stringify({ manifest, control_status: controlStatus })
    : JSON.stringify(manifest);
  const bundleHash = crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('hex');

  const signer = getLedgerSigner();
  const signature = signer.sign(Buffer.from(bundleHash));
  const keyId = process.env.ATP_SIGNING_KEY_ID || 'key_default';

  return {
    bundle_hash: bundleHash,
    signature,
    key_id: keyId,
    signed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Row → EvidenceBundle mapper
// ---------------------------------------------------------------------------

function rowToBundle(row: any): EvidenceBundle {
  return {
    id: row.id,
    tenant_id: row.org_id,
    version: row.version ?? 1,
    regulation: row.regulation as Regulation,
    period: {
      start: row.evidence_period_start,
      end: row.evidence_period_end,
    },
    manifest: row.json_export,
    coverage: row.article_coverage as BundleCoverage,
    attestation: {
      bundle_hash: '',
      signature: row.attestation_signature ?? '',
      key_id: row.attestation_key_id ?? '',
      signed_at: row.generated_at ?? '',
    },
    generated_at: row.generated_at,
    generated_by: row.generated_by ?? 'system',
    export_formats_available: ['json', 'pdf'],
    status: row.status as EvidenceBundle['status'],
  };
}

// ---------------------------------------------------------------------------
// EvidenceService
// ---------------------------------------------------------------------------

export class EvidenceService {
  /**
   * Generate an evidence bundle.
   * 1. Delegate to the appropriate regulation-specific generator
   * 2. Compute normalized coverage
   * 3. Sign with Ed25519 via getLedgerSigner()
   * 4. Store in compliance_reports
   * 5. Append 'evidence.generated' audit event
   * 6. Return the complete EvidenceBundle
   */
  static async generate(params: {
    tenant_id: string;
    regulation: Regulation;
    period: { start: string; end: string };
    generated_by: string;
  }): Promise<EvidenceBundle> {
    const supabase = createAdminClient();

    // 1. Generate the regulation-specific report
    let manifest: EuAiActReport | Iso42001Report;
    let coverage: BundleCoverage;
    let reportType: string;

    if (params.regulation === 'eu_ai_act') {
      manifest = await EuAiActReportGenerator.generate(params.tenant_id, {
        period_start: params.period.start,
        period_end: params.period.end,
        framework: 'EU_AI_ACT_2024',
      });
      coverage = computeEuAiActCoverage(manifest as EuAiActReport);
      reportType = 'EU_AI_ACT_2024';
    } else {
      manifest = await Iso42001ReportGenerator.generate(params.tenant_id, {
        period_start: params.period.start,
        period_end: params.period.end,
      });
      coverage = computeIso42001Coverage(manifest as Iso42001Report);
      reportType = 'ISO_42001_2023';
    }

    // 2. Build control status snapshot (optional — omit if no controls)
    let controlStatus: ControlStatusSnapshot | undefined;
    {
      const { data: controls } = await supabase
        .from('controls')
        .select('name, status, clause_ref, last_evaluated_at')
        .eq('tenant_id', params.tenant_id)
        .or(`regulation.eq.${params.regulation},regulation.is.null`);

      if (controls && controls.length > 0) {
        const clauseMap = new Map<string, Array<{ name: string; status: string; last_evaluated: string | null }>>();
        let passing = 0;
        let failing = 0;
        let warning = 0;

        for (const c of controls) {
          if (c.status === 'passing') passing++;
          else if (c.status === 'failing') failing++;
          else if (c.status === 'warning') warning++;

          const ref = c.clause_ref || 'unassigned';
          if (!clauseMap.has(ref)) clauseMap.set(ref, []);
          clauseMap.get(ref)!.push({
            name: c.name,
            status: c.status,
            last_evaluated: c.last_evaluated_at || null,
          });
        }

        controlStatus = {
          total_controls: controls.length,
          passing,
          failing,
          warning,
          by_clause: Array.from(clauseMap.entries()).map(([clause_ref, ctrls]) => ({
            clause_ref,
            controls: ctrls,
          })),
        };
      }
    }

    // 2b. Build HITL receipt snapshot (resolved tickets within the evidence period)
    let hitlReceipts: HitlReceiptSnapshot | undefined;
    {
      const { data: resolvedTickets } = await supabase
        .from('hitl_exceptions')
        .select('id, agent_id, status, resolved_by, resolved_at, context_data')
        .eq('tenant_id', params.tenant_id)
        .in('status', ['approved', 'rejected'])
        .gte('resolved_at', params.period.start)
        .lte('resolved_at', params.period.end);

      if (resolvedTickets && resolvedTickets.length > 0) {
        const approved = resolvedTickets.filter((t: any) => t.status === 'approved').length;
        const rejected = resolvedTickets.filter((t: any) => t.status === 'rejected').length;
        hitlReceipts = {
          total_resolved: resolvedTickets.length,
          approved,
          rejected,
          receipts: resolvedTickets.map((t: any) => ({
            id: t.id,
            agent_id: t.agent_id,
            decision: t.status as 'approved' | 'rejected',
            decided_by: t.resolved_by || 'unknown',
            decided_at: t.resolved_at || '',
            blast_radius_level: t.context_data?.blast_radius?.level,
          })),
        };
      }
    }

    // 3. Compute Ed25519 attestation (includes control_status so it's covered by signature)
    const attestation = computeAttestation(manifest, controlStatus);

    // 4. Determine next version for this tenant + regulation
    const { data: maxVersionRow } = await supabase
      .from('compliance_reports')
      .select('version')
      .eq('org_id', params.tenant_id)
      .eq('regulation', params.regulation)
      .order('version', { ascending: false })
      .limit(1)
      .single()
      .catch(() => ({ data: null }));

    const nextVersion = (maxVersionRow?.version ?? 0) + 1;

    // 5. Store in compliance_reports
    const { data: reportRecord, error: insertError } = await supabase
      .from('compliance_reports')
      .insert({
        org_id: params.tenant_id,
        report_type: reportType,
        regulation: params.regulation,
        status: 'ready',
        json_export: manifest as unknown as Record<string, unknown>,
        evidence_period_start: params.period.start,
        evidence_period_end: params.period.end,
        coverage_score: coverage.overall_score,
        article_coverage: coverage,
        version: nextVersion,
        attestation_signature: attestation.signature,
        attestation_key_id: attestation.key_id,
        generated_by: params.generated_by,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !reportRecord) {
      throw new Error(`Failed to store evidence bundle: ${insertError?.message ?? 'unknown error'}`);
    }

    // 6. Append audit event
    await AuditLedgerService.appendEvent({
      event_type: 'evidence.generated',
      module: 's13',
      tenant_id: params.tenant_id,
      payload: {
        bundle_id: reportRecord.id,
        regulation: params.regulation,
        version: nextVersion,
        coverage_score: coverage.overall_score,
      },
    });

    // 7. Return EvidenceBundle
    return {
      id: reportRecord.id,
      tenant_id: params.tenant_id,
      version: nextVersion,
      regulation: params.regulation,
      period: params.period,
      manifest,
      coverage,
      control_status: controlStatus,
      hitl_receipts: hitlReceipts,
      attestation,
      generated_at: reportRecord.generated_at,
      generated_by: params.generated_by,
      export_formats_available: ['json', 'pdf'],
      status: 'ready',
    };
  }

  /**
   * Retrieve an existing bundle by ID.
   * Returns null if not found or wrong tenant (tenant isolation).
   */
  static async getById(
    tenant_id: string,
    bundle_id: string,
  ): Promise<EvidenceBundle | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('compliance_reports')
      .select('*')
      .eq('id', bundle_id)
      .eq('org_id', tenant_id)
      .single();

    if (error || !data) return null;

    // Audit: evidence.accessed
    await AuditLedgerService.appendEvent({
      event_type: 'evidence.accessed',
      module: 's13',
      tenant_id,
      payload: { bundle_id, regulation: data.regulation },
    });

    return rowToBundle(data);
  }

  /**
   * List bundles for a tenant with optional regulation filter.
   */
  static async list(
    tenant_id: string,
    filters?: {
      regulation?: Regulation;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ bundles: EvidenceBundle[]; total: number }> {
    const supabase = createAdminClient();
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    let query = supabase
      .from('compliance_reports')
      .select('*', { count: 'exact' })
      .eq('org_id', tenant_id)
      .not('regulation', 'is', null)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.regulation) {
      query = query.eq('regulation', filters.regulation);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to list evidence bundles: ${error.message}`);
    }

    const bundles = (data ?? []).map(rowToBundle);

    return { bundles, total: count ?? 0 };
  }
}
