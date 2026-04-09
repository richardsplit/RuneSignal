import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';

/**
 * GET /api/v1/redteam/findings
 * List red team findings for the tenant.
 * Query params: campaign_id, severity, result, owasp_category, limit
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaign_id');
  const severity = searchParams.get('severity');
  const result = searchParams.get('result');
  const owaspCategory = searchParams.get('owasp_category');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

  const supabase = createAdminClient();
  // red_team_attacks doesn't have tenant_id — join via campaign
  let query = supabase
    .from('red_team_attacks')
    .select('*, red_team_campaigns!inner(tenant_id)')
    .eq('red_team_campaigns.tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (severity) query = query.eq('severity', severity);
  if (result) query = query.eq('was_defended', result === 'pass');
  if (owaspCategory) query = query.eq('owasp_category', owaspCategory);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by OWASP category
  const owaspSummary: Record<string, { defended: number; breached: number; total: number }> = {};
  (data || []).forEach((f: any) => {
    const cat = f.owasp_category || 'uncategorized';
    if (!owaspSummary[cat]) owaspSummary[cat] = { defended: 0, breached: 0, total: 0 };
    owaspSummary[cat].total++;
    if (f.was_defended) owaspSummary[cat].defended++;
    else owaspSummary[cat].breached++;
  });

  return NextResponse.json({ attacks: data || [], owasp_summary: owaspSummary, count: (data || []).length });
}
