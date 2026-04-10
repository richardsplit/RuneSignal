import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string }> }
) {
  try {
    const { report_id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('compliance_reports')
      .select('status, json_export, pdf_url')
      .eq('id', report_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (data.status !== 'ready') {
      return NextResponse.json({ error: `Report status is ${data.status}` }, { status: 400 });
    }

    if (data.pdf_url) {
      return NextResponse.redirect(data.pdf_url);
    }

    // Generate a simple HTML-based PDF placeholder response
    const report = data.json_export as any;
    const html = generateReportHtml(report, report_id);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="eu-ai-act-report-${report_id}.html"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateReportHtml(report: any, reportId: string): string {
  const meta = report?.report_metadata || {};
  const articles = report?.article_coverage || {};
  const ledger = report?.action_ledger_summary || {};

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { covered: '#22c55e', partial: '#f59e0b', not_covered: '#ef4444' };
    return `<span style="background:${colors[s] || '#6b7280'};color:white;padding:2px 8px;border-radius:4px;font-size:12px">${s.replace('_', ' ')}</span>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>EU AI Act Compliance Evidence Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; color: #111; line-height: 1.6; }
  h1 { font-size: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
  h2 { font-size: 18px; margin-top: 32px; color: #1d4ed8; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { text-align: left; padding: 8px 12px; border: 1px solid #e5e7eb; }
  th { background: #f9fafb; }
  .meta { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .hash { font-family: monospace; font-size: 11px; word-break: break-all; color: #6b7280; }
</style>
</head>
<body>
<h1>EU AI Act Compliance Evidence Report</h1>
<div class="meta">
  <strong>Report ID:</strong> ${reportId}<br>
  <strong>Framework:</strong> ${meta.framework || 'EU AI Act (Regulation 2024/1689)'}<br>
  <strong>Enforcement Date:</strong> ${meta.enforcement_date || '2026-08-02'}<br>
  <strong>Generated:</strong> ${meta.generated_at || new Date().toISOString()}<br>
  <strong>Evidence Period:</strong> ${meta.evidence_period?.from || ''} → ${meta.evidence_period?.to || ''}<br>
  <strong>Organization:</strong> ${meta.organization?.name || meta.organization?.id || 'N/A'}<br>
  <strong>Ledger Root Hash:</strong> <span class="hash">${meta.cryptographic_integrity?.ledger_root_hash || 'N/A'}</span>
</div>

<h2>Article Coverage</h2>
<table>
  <tr><th>Article</th><th>Requirement</th><th>Status</th><th>Evidence Count</th></tr>
  <tr>
    <td><strong>Art. 13</strong></td>
    <td>Transparency</td>
    <td>${statusBadge(articles.article_13_transparency?.status || 'not_covered')}</td>
    <td>${articles.article_13_transparency?.evidence_count || 0} signed events</td>
  </tr>
  <tr>
    <td><strong>Art. 14</strong></td>
    <td>Human Oversight</td>
    <td>${statusBadge(articles.article_14_human_oversight?.status || 'not_covered')}</td>
    <td>${articles.article_14_human_oversight?.hitl_reviews || 0} HITL reviews</td>
  </tr>
  <tr>
    <td><strong>Art. 17</strong></td>
    <td>Quality Management</td>
    <td>${statusBadge(articles.article_17_quality_management?.status || 'not_covered')}</td>
    <td>${articles.article_17_quality_management?.anomalies_detected || 0} anomalies tracked</td>
  </tr>
  <tr>
    <td><strong>Art. 26</strong></td>
    <td>Deployer Obligations</td>
    <td>${statusBadge(articles.article_26_deployer_obligations?.status || 'not_covered')}</td>
    <td>${articles.article_26_deployer_obligations?.agent_inventory_count || 0} agents inventoried</td>
  </tr>
</table>

<h2>Action Ledger Summary</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Total Agent Actions</td><td>${ledger.total_actions || 0}</td></tr>
  <tr><td>Cryptographically Signed</td><td>${ledger.cryptographically_signed || 0}</td></tr>
  <tr><td>Coverage</td><td>${ledger.coverage_percentage || 0}%</td></tr>
</table>

<h2>Attestation</h2>
<p>
  <strong>Signed by:</strong> ${report?.attestation?.signed_by || 'RuneSignal Compliance Engine'}<br>
  <strong>Timestamp:</strong> ${report?.attestation?.timestamp || new Date().toISOString()}<br>
  <strong>Signature:</strong> <span class="hash">${report?.attestation?.signature || 'N/A'}</span>
</p>

<hr style="margin-top: 48px">
<p style="font-size: 12px; color: #9ca3af">
  This document was generated by RuneSignal Compliance Engine. 
  It constitutes a good-faith evidence package for EU AI Act compliance purposes.
  Legal review by qualified counsel is recommended before submission to regulators.
</p>
</body>
</html>`;
}
