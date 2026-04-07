import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'X-Tenant-Id required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: nodes } = await supabase
    .from('agent_spawn_graph')
    .select(`
      id,
      parent_agent_id,
      child_key_id,
      purpose,
      delegation_depth,
      spawned_at,
      expires_at,
      api_keys (
        key_prefix,
        is_active
      )
    `)
    .eq('tenant_id', tenantId)
    .order('spawned_at', { ascending: false });

  return NextResponse.json({ nodes: nodes || [] });
}
