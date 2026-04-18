import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/physical/log
 * Retrieve the immutable physical action log.
 * Query params: physical_agent_id, verdict, limit
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('physical_agent_id');
  const verdict = searchParams.get('verdict');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

  const supabase = createAdminClient();
  let query = supabase
    .from('physical_action_log')
    .select('*, physical_agents(name, device_type, location_zone)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (agentId) query = query.eq('physical_agent_id', agentId);
  if (verdict) query = query.eq('verdict', verdict);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ log: data || [], count: (data || []).length });
}
