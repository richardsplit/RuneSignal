import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * POST /api/v1/integrations/jira/install
 * Saves Jira integration config (API token + project key).
 * Body: { base_url, api_token, user_email, project_key, issue_type? }
 *
 * DELETE /api/v1/integrations/jira/install
 * Disconnects the Jira integration.
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

  const { base_url, api_token, user_email, project_key, issue_type } = body;
  if (!base_url || !api_token || !user_email || !project_key) {
    return NextResponse.json(
      { error: 'Required: base_url, api_token, user_email, project_key' },
      { status: 400 }
    );
  }

  // Test the connection
  const testRes = await fetch(`${base_url}/rest/api/3/project/${project_key}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${user_email}:${api_token}`).toString('base64')}`,
      Accept: 'application/json',
    },
  });

  if (!testRes.ok) {
    return NextResponse.json(
      { error: 'Jira connection test failed. Check your credentials and project key.' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('integration_channels').upsert({
    tenant_id: tenantId,
    provider: 'jira',
    config: { base_url, api_token, user_email, project_key, issue_type: issue_type || 'Task' },
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,provider' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Jira integration configured successfully' });
}

export async function DELETE(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  await supabase.from('integration_channels')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('provider', 'jira');

  return NextResponse.json({ message: 'Jira integration disconnected' });
}
