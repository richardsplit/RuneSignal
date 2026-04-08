import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';

/**
 * GET /api/v1/firewall/evaluations
 * Returns recent firewall evaluations for the authenticated tenant.
 * Used by the dashboard at /firewall.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const verdict = searchParams.get('verdict'); // optional filter: allow|block|escalate

  const supabase = createAdminClient();

  let query = supabase
    .from('firewall_evaluations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (verdict && ['allow', 'block', 'escalate'].includes(verdict)) {
    query = query.eq('verdict', verdict);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
