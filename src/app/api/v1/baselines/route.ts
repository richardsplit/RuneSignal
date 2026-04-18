import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/baselines
 * List behavioral baselines for the tenant.
 * Query params: agent_id
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id');

  const supabase = createAdminClient();
  let query = supabase
    .from('anomaly_baselines')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('computed_at', { ascending: false });

  if (agentId) query = query.eq('agent_id', agentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ baselines: data || [] });
}
