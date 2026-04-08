import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/db/supabase';

/**
 * GET /api/v1/integrations
 * Returns all integration channels for the tenant with connection status.
 * Config secrets are masked for security.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('integration_channels')
    .select('id, provider, is_active, created_at, updated_at, config')
    .eq('tenant_id', tenantId)
    .order('provider');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mask sensitive config fields
  const sanitized = (data || []).map(ch => ({
    ...ch,
    config: maskConfig(ch.provider, ch.config as Record<string, unknown>),
  }));

  return NextResponse.json(sanitized);
}

function maskConfig(provider: string, config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config };
  switch (provider) {
    case 'slack':
      if (masked.bot_token) masked.bot_token = 'xoxb-••••••••••••';
      if (masked.signing_secret) masked.signing_secret = '••••••••••••';
      break;
    case 'jira':
      if (masked.api_token) masked.api_token = '••••••••••••';
      break;
    case 'servicenow':
      if (masked.password) masked.password = '••••••••••••';
      break;
    case 'webhook':
      if (masked.secret) masked.secret = '••••••••••••';
      break;
  }
  return masked;
}
