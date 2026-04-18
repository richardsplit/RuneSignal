import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/integrations/teams/install
 * Configure a Microsoft Teams incoming webhook for HITL notifications.
 *
 * Unlike Slack, Teams uses incoming webhooks or Bot Framework.
 * This endpoint saves a webhook URL + optional bot credentials.
 *
 * POST /api/v1/integrations/teams/install
 * Body: { webhook_url: string, channel_name?: string }
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

  const { webhook_url, channel_name } = body;
  if (!webhook_url) {
    return NextResponse.json({ error: 'Missing webhook_url' }, { status: 400 });
  }

  // Validate the webhook URL looks like a Teams webhook
  if (!webhook_url.includes('office.com') && !webhook_url.includes('webhook.office.com')) {
    return NextResponse.json(
      { error: 'webhook_url must be a valid Microsoft Teams webhook URL' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('integration_channels').upsert({
    tenant_id: tenantId,
    provider: 'teams',
    config: {
      webhook_url,
      channel_name: channel_name || 'Teams channel',
    },
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,provider' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Teams integration configured successfully' });
}

export async function DELETE(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  await supabase.from('integration_channels')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('provider', 'teams');

  return NextResponse.json({ message: 'Teams integration disconnected' });
}
