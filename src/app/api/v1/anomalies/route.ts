import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/db/supabase';

/**
 * GET /api/v1/anomalies
 * List behavioral anomalies for the tenant.
 * Query params: severity, resolved (true|false), limit, agent_id
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  const resolvedParam = searchParams.get('resolved');
  const agentId = searchParams.get('agent_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  const supabase = createAdminClient();
  let query = supabase
    .from('anomaly_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (severity) query = query.eq('severity', severity);
  if (agentId) query = query.eq('agent_id', agentId);
  if (resolvedParam === 'false') query = query.is('resolved_at', null);
  if (resolvedParam === 'true') query = query.not('resolved_at', 'is', null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ anomalies: data || [], count: (data || []).length });
}
