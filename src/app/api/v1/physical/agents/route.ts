import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';

/**
 * GET /api/v1/physical/agents
 * List all registered physical agents for the tenant.
 *
 * POST /api/v1/physical/agents
 * Register a new physical agent device.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const supabase = createAdminClient();
  let query = supabase
    .from('physical_agents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ agents: data || [], count: (data || []).length });
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    device_id?: string;
    device_type?: string;
    name?: string;
    location_zone?: string;
    allowed_zones?: string[];
    max_payload_kg?: number;
    firmware_version?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { device_id, device_type, name } = body;
  if (!device_id || !device_type || !name) {
    return NextResponse.json({ error: 'Missing required: device_id, device_type, name' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('physical_agents')
    .insert({
      tenant_id: tenantId,
      device_id,
      device_type,
      name,
      location_zone: body.location_zone || null,
      allowed_zones: body.allowed_zones || [],
      max_payload_kg: body.max_payload_kg || null,
      firmware_version: body.firmware_version || null,
      metadata: body.metadata || {},
      status: 'active',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ agent: data }, { status: 201 });
}
