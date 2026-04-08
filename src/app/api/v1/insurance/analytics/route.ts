import { NextRequest, NextResponse } from 'next/server';
import { RiskAnalytics } from '../../../../../../lib/modules/s5-insurance/analytics';

/**
 * GET /api/v1/insurance/analytics
 * Returns 30/60/90-day risk trend data plus per-agent summaries.
 * Requires X-Tenant-Id header.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  try {
    const analytics = await RiskAnalytics.getAnalytics(tenantId);
    return NextResponse.json(analytics);
  } catch (e: any) {
    console.error('Risk analytics failed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
