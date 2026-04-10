import { NextRequest, NextResponse } from 'next/server';
import { ComplianceReportGenerator } from '../../../../../../lib/modules/compliance/report-generator';

/**
 * GET /api/v1/compliance/reports
 * Generates a point-in-time compliance evidence report.
 *
 * Query params:
 *   from=ISO_DATE          (default: 30 days ago)
 *   to=ISO_DATE            (default: now)
 *   framework=soc2|hipaa|gdpr|pci-dss|general  (default: general)
 *   format=json|summary    (default: json)
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const framework = (searchParams.get('framework') || 'general') as
    | 'soc2'
    | 'hipaa'
    | 'gdpr'
    | 'pci-dss'
    | 'general';
  const format = (searchParams.get('format') || 'json') as 'json' | 'summary';

  const validFrameworks = ['soc2', 'hipaa', 'gdpr', 'pci-dss', 'general'];
  if (!validFrameworks.includes(framework)) {
    return NextResponse.json(
      { error: `Invalid framework. Use one of: ${validFrameworks.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const report = await ComplianceReportGenerator.generate(tenantId, {
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
      framework,
      format,
    });

    if (format === 'summary') {
      return NextResponse.json({
        id: report.id,
        generated_at: report.generated_at,
        period: report.period,
        framework: report.framework,
        summary: report.summary,
        installed_policy_packs: report.installed_policy_packs,
      });
    }

    return NextResponse.json(report, {
      headers: {
        'X-Report-Id': report.id,
        'X-Report-Framework': report.framework,
        'X-RuneSignal-Report': 'compliance',
      },
    });
  } catch (e: any) {
    console.error('Compliance report generation failed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
