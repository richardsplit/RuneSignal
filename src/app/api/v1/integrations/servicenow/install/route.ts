import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../../lib/db/supabase';

/**
 * POST /api/v1/integrations/servicenow/install
 * Saves ServiceNow integration config.
 * Body: { instance_url, username, password, table?, category? }
 *
 * DELETE /api/v1/integrations/servicenow/install
 * Disconnects.
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { instance_url, username, password, table, category } = body;
  if (!instance_url || !username || !password) {
    return NextResponse.json(
      { error: 'Required: instance_url, username, password' },
      { status: 400 }
    );
  }

  // Test connection
  const testRes = await fetch(`${instance_url}/api/now/table/incident?sysparm_limit=1`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      Accept: 'application/json',
    },
  });

  if (!testRes.ok) {
    return NextResponse.json(
      { error: 'ServiceNow connection test failed. Check your instance URL and credentials.' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('integration_channels').upsert({
    tenant_id: tenantId,
    provider: 'servicenow',
    config: { instance_url, username, password, table: table || 'incident', category: category || 'AI Governance' },
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,provider' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'ServiceNow integration configured successfully' });
}

export async function DELETE(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  await supabase.from('integration_channels')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('provider', 'servicenow');

  return NextResponse.json({ message: 'ServiceNow integration disconnected' });
}
