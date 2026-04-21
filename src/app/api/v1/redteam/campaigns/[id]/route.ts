import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/redteam/campaigns/[id]
 * Get a specific red team campaign with its findings summary.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();

  const [{ data: campaign, error: campErr }, { data: findings, error: findErr }] = await Promise.all([
    supabase
      .from('red_team_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('red_team_attacks')
      .select('*')
      .eq('campaign_id', id)
      .order('severity', { ascending: false }),
  ]);

  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });

  return NextResponse.json({ campaign, attacks: findings || [] });
}
