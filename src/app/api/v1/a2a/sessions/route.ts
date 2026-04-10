import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';

/**
 * GET /api/v1/a2a/sessions
 * List A2A sessions for the tenant.
 * Query params: status, initiator_id, limit
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const initiatorId = searchParams.get('initiator_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  const supabase = createAdminClient();
  let query = supabase
    .from('a2a_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (initiatorId) query = query.eq('initiator_id', initiatorId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessions: data || [], count: (data || []).length });
}
