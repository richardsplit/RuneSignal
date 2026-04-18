import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/plugins/:id  — Get single plugin details with recent executions
 * PATCH /api/v1/plugins/:id — Update plugin config (name, description, is_active, retry_count, timeout_ms)
 * DELETE /api/v1/plugins/:id — Deactivate (soft delete) plugin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  const { data: plugin, error } = await supabase
    .from('plugins')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !plugin) {
    return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  }

  // Fetch recent executions
  const { data: executions } = await supabase
    .from('plugin_executions')
    .select('*')
    .eq('plugin_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ plugin, executions: executions || [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only allow safe fields to be updated
  const allowed = ['name', 'description', 'is_active', 'retry_count', 'timeout_ms', 'auth_header', 'endpoint_url'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('plugins')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });

  return NextResponse.json({ plugin: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('plugins')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });

  return NextResponse.json({ success: true, plugin: data });
}
