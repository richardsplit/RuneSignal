/**
 * POST /api/v1/compliance/evidence-export
 *
 * EU AI Act Evidence Package Export endpoint.
 * Generates a structured JSON manifest mapping provenance, HITL, and
 * explainability events to the relevant EU AI Act articles.
 *
 * Delegates to the existing EuAiActReportGenerator for the heavy lifting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import {
  EuAiActReportGenerator,
  type EuAiActReport,
} from '@lib/modules/compliance/eu-ai-act-report';
import {
  Iso42001ReportGenerator,
  type Iso42001Report,
} from '@lib/modules/compliance/iso-42001-report';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

type Regulation = 'eu_ai_act' | 'iso_42001';

interface EvidenceExportRequest {
  tenant_id?: string;
  date_range: {
    start: string;
    end: string;
  };
  regulation: Regulation;
}

interface EvidenceExportResponse {
  export_id: string;
  regulation: Regulation;
  status: 'ready' | 'generating' | 'failed';
  evidence_manifest: EuAiActReport | Iso42001Report;
}

/**
 * Resolve tenant ID from (in order):
 *  1. API key in Authorization header
 *  2. X-Tenant-Id header
 *  3. tenant_id in request body
 *
 * Never falls back to a hardcoded value.
 */
async function resolveTenantId(
  req: NextRequest,
  bodyTenantId?: string,
): Promise<string | null> {
  // 1. Try API key
  const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  if (apiKey) {
    const supabase = createAdminClient();
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
      .single()
      .catch(() => ({ data: null }));

    if (keyData?.tenant_id) return keyData.tenant_id;
  }

  // 2. X-Tenant-Id header
  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  // 3. Body tenant_id
  if (bodyTenantId) return bodyTenantId;

  return null;
}

export async function POST(req: NextRequest) {
  let body: EvidenceExportRequest | undefined;
  let tenantId: string | null = null;
  try {
    body = await req.json() as EvidenceExportRequest;
    if (!body) throw new Error('Empty request body');

    // Validate required fields
    if (!body.date_range?.start || !body.date_range?.end) {
      return NextResponse.json(
        { error: 'date_range.start and date_range.end are required' },
        { status: 400 },
      );
    }

    if (!body.regulation) {
      return NextResponse.json(
        { error: 'regulation is required (eu_ai_act | iso_42001)' },
        { status: 400 },
      );
    }

    const validRegulations: Regulation[] = ['eu_ai_act', 'iso_42001'];
    if (!validRegulations.includes(body.regulation)) {
      return NextResponse.json(
        { error: `Invalid regulation. Must be one of: ${validRegulations.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve tenant - NO 'demo-tenant' fallback
    tenantId = await resolveTenantId(req, body.tenant_id);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header, X-Tenant-Id header, or tenant_id in body.' },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    // ─── ISO 42001 evidence package ───────────────────────────────────────────
    if (body.regulation === 'iso_42001') {
      const report = await Iso42001ReportGenerator.generate(tenantId, {
        period_start: body.date_range.start,
        period_end: body.date_range.end,
      });

      const clauseCoverage = Iso42001ReportGenerator.computeClauseCoverage(report);

      const { data: reportRecord } = await supabase
        .from('compliance_reports')
        .insert({
          org_id: tenantId,
          report_type: 'evidence-export',
          framework_version: 'ISO_42001_2023',
          status: 'ready',
          json_export: report as unknown as Record<string, unknown>,
          evidence_period_start: body.date_range.start,
          evidence_period_end: body.date_range.end,
          coverage_score: report.overall_coverage_score,
          article_coverage: clauseCoverage,
          agent_count: report.ai_system_inventory.length,
          action_count: report.clause_coverage.technical_documentation.provenance_records_count,
          hitl_reviews_count: report.clause_coverage.human_oversight_logs.total_reviews,
          generated_at: new Date().toISOString(),
        })
        .select('id')
        .single()
        .catch(() => ({ data: null }));

      const exportId = reportRecord?.id || report.report_metadata.report_id;

      return NextResponse.json({
        export_id: exportId,
        regulation: body.regulation,
        status: 'ready',
        evidence_manifest: report,
      } as EvidenceExportResponse, { status: 200 });
    }

    // ─── EU AI Act evidence package ───────────────────────────────────────────
    const report = await EuAiActReportGenerator.generate(tenantId, {
      period_start: body.date_range.start,
      period_end: body.date_range.end,
      framework: 'EU_AI_ACT_2024',
    });

    const articleCoverage = EuAiActReportGenerator.computeArticleCoverage(report);

    const { data: reportRecord } = await supabase
      .from('compliance_reports')
      .insert({
        org_id: tenantId,
        report_type: 'evidence-export',
        framework_version: 'EU_AI_ACT_AUG_2026',
        status: 'ready',
        json_export: report as unknown as Record<string, unknown>,
        evidence_period_start: body.date_range.start,
        evidence_period_end: body.date_range.end,
        coverage_score: report.action_ledger_summary.coverage_percentage,
        article_coverage: articleCoverage,
        agent_count: report.agent_inventory.length,
        action_count: report.action_ledger_summary.total_actions,
        hitl_reviews_count: report.hitl_review_log.length,
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single()
      .catch(() => ({ data: null }));

    const exportId = reportRecord?.id || report.report_metadata.report_id;

    const response: EvidenceExportResponse = {
      export_id: exportId,
      regulation: body.regulation,
      status: 'ready',
      evidence_manifest: report,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: '/api/v1/compliance/evidence-export', component: 'evidence-export' },
      extra: { regulation: body?.regulation, tenant_id: tenantId },
    });
    console.error('[compliance/evidence-export] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
