import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { EuAiActReportGenerator } from '@/lib/modules/compliance/eu-ai-act-report';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { period_start, period_end, framework = 'EU_AI_ACT_2024' } = body;

    if (!period_start || !period_end) {
      return NextResponse.json({ error: 'period_start and period_end are required' }, { status: 400 });
    }

    // Extract tenant from API key header or session
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const supabase = createAdminClient();

    // Resolve tenant from API key
    let keyData: { tenant_id: string } | null = null;
    try {
      const { data } = await supabase
        .from('api_keys')
        .select('tenant_id')
        .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
        .single();
      keyData = data;
    } catch { /* invalid key */ }

    // Resolve tenant from API key or header — no hardcoded fallback
    const tenantId = keyData?.tenant_id || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    // Create a placeholder report record with 'generating' status
    const { data: reportRecord, error: insertError } = await supabase
      .from('compliance_reports')
      .insert({
        org_id: tenantId,
        report_type: framework,
        framework_version: framework === 'EU_AI_ACT_2024' ? 'EU_AI_ACT_AUG_2026' : 'NIST_AI_RMF_1.0',
        status: 'generating',
        evidence_period_start: period_start,
        evidence_period_end: period_end,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[compliance/reports/generate] insert error:', insertError);
    }

    const reportId = reportRecord?.id || `rpt_${Date.now()}`;

    // Generate the report asynchronously (fire and update)
    setImmediate(async () => {
      try {
        const report = await EuAiActReportGenerator.generate(tenantId, {
          period_start,
          period_end,
          framework,
        });

        const articleCoverage = EuAiActReportGenerator.computeArticleCoverage(report);
        const coverageScore = report.action_ledger_summary.coverage_percentage;

        await supabase
          .from('compliance_reports')
          .update({
            status: 'ready',
            json_export: report as any,
            agent_count: report.agent_inventory.length,
            action_count: report.action_ledger_summary.total_actions,
            hitl_reviews_count: report.hitl_review_log.length,
            coverage_score: coverageScore,
            article_coverage: articleCoverage,
            generated_at: new Date().toISOString(),
          })
          .eq('id', reportId)
          .then(({ error: e }) => { if (e) console.error('[compliance/reports] update failed:', e); });
      } catch (err) {
        console.error('[compliance/reports] generation failed:', err);
        supabase
          .from('compliance_reports')
          .update({ status: 'failed', error_message: String(err) })
          .eq('id', reportId)
          .then(({ error: e }) => { if (e) console.error('[compliance/reports] fail-update error:', e); });
      }
    });

    return NextResponse.json({
      report_id: reportId,
      status: 'generating',
      estimated_seconds: 30,
    }, { status: 202 });
  } catch (err) {
    console.error('[compliance/reports/generate] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
