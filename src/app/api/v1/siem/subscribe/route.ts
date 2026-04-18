import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * POST /api/v1/siem/subscribe
 * Registers a SIEM push endpoint for real-time event forwarding.
 * Body: { name, endpoint_url, format, auth_header?, event_filter? }
 *
 * GET /api/v1/siem/subscribe
 * Lists configured SIEM endpoints.
 *
 * DELETE /api/v1/siem/subscribe?id=uuid
 * Removes a SIEM endpoint.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('siem_endpoints')
    .select('id, name, endpoint_url, format, event_filter, is_active, last_push_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, endpoint_url, format = 'json', auth_header, event_filter } = body;
  if (!endpoint_url) return NextResponse.json({ error: 'Missing endpoint_url' }, { status: 400 });
  if (!['json', 'cef'].includes(format)) {
    return NextResponse.json({ error: 'format must be "json" or "cef"' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('siem_endpoints')
    .insert({
      tenant_id: tenantId,
      name: name || 'SIEM Endpoint',
      endpoint_url,
      format,
      auth_header: auth_header || null,
      event_filter: event_filter || null,
      is_active: true,
    })
    .select('id, name, endpoint_url, format')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 });

  const supabase = createAdminClient();
  await supabase
    .from('siem_endpoints')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  return NextResponse.json({ message: 'SIEM endpoint removed' });
}
