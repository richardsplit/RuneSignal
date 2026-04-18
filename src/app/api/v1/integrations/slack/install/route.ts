import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/integrations/slack/install
 * Initiates the Slack OAuth2 flow. Redirects user to Slack authorization page.
 *
 * POST /api/v1/integrations/slack/install
 * Handles the OAuth callback — exchanges code for bot token, saves to integration_channels.
 *
 * Slack App Setup:
 *   Redirect URL: https://your-domain.com/api/v1/integrations/slack/install
 *   Required scopes: chat:write, channels:read, reactions:write
 */

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // tenant_id encoded here
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL('/account-settings/integrations?error=slack_denied', request.url)
    );
  }

  // Step 1: No code yet — redirect to Slack OAuth
  if (!code) {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      scope: 'chat:write,channels:read,groups:read',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/slack/install`,
      state: tenantId, // Pass tenant ID through OAuth state
    });

    return NextResponse.redirect(
      `https://slack.com/oauth/v2/authorize?${params.toString()}`
    );
  }

  // Step 2: Exchange code for bot token
  const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/slack/install`,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.ok) {
    return NextResponse.redirect(
      new URL(`/account-settings/integrations?error=slack_token_failed`, request.url)
    );
  }

  const tenantId = state;
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant state' }, { status: 400 });
  }

  // Save to integration_channels (upsert)
  const supabase = createAdminClient();
  await supabase.from('integration_channels').upsert({
    tenant_id: tenantId,
    provider: 'slack',
    config: {
      bot_token: tokenData.access_token,
      channel_id: tokenData.incoming_webhook?.channel_id || '',
      channel_name: tokenData.incoming_webhook?.channel || '',
      team_id: tokenData.team?.id,
      team_name: tokenData.team?.name,
      // signing_secret must be set manually in settings (from Slack App config)
      signing_secret: process.env.SLACK_SIGNING_SECRET || '',
    },
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,provider' });

  return NextResponse.redirect(
    new URL('/account-settings/integrations?success=slack', request.url)
  );
}
