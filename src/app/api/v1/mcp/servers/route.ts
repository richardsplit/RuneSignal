import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * GET  /api/v1/mcp/servers — list registered MCP servers for tenant
 * POST /api/v1/mcp/servers — register a new MCP server
 */
export async function GET(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('mcp_servers')
    .select('id, name, endpoint, trust_level, capabilities, call_count, hitl_count, blocked_count, last_called_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ servers: data ?? [], total: data?.length ?? 0 });
}

export async function POST(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name: string; endpoint: string; trust_level?: string; description?: string; capabilities?: string[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.name)     return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!body.endpoint) return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('mcp_servers')
    .insert({
      tenant_id:    tenantId,
      name:         body.name,
      endpoint:     body.endpoint,
      trust_level:  body.trust_level ?? 'untrusted',
      description:  body.description ?? null,
      capabilities: body.capabilities ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ server: data }, { status: 201 });
}
