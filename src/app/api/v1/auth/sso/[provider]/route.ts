import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { OktaSSOProvider } from '@lib/auth/sso/okta';
import { EntraSSOProvider } from '@lib/auth/sso/entra';
import { Auth0SSOProvider } from '@lib/auth/sso/auth0';
import { buildRedirectUri, SSOProvider } from '@lib/auth/sso/provider';

/**
 * GET /api/v1/auth/sso/:provider
 * Initiates the SSO login flow — redirects to the identity provider.
 *
 * GET /api/v1/auth/sso/:provider/callback (handled by same route via ?code= param)
 * Handles the OAuth callback — exchanges code for tokens, creates/links Supabase user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // tenant_id

  const supportedProviders = ['okta', 'entra', 'auth0'];
  if (!supportedProviders.includes(providerName)) {
    return NextResponse.json({ error: `Unsupported provider: ${providerName}` }, { status: 400 });
  }

  // No code = initiate flow
  if (!code) {
    const tenantId = request.headers.get('X-Tenant-Id') || searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required to initiate SSO' }, { status: 400 });
    }

    const ssoProvider = await getSSOProvider(providerName, tenantId);
    if (!ssoProvider) {
      return NextResponse.json({ error: `${providerName} SSO not configured for this tenant` }, { status: 404 });
    }

    const authUrl = ssoProvider.getAuthorizationUrl(tenantId);
    return NextResponse.redirect(authUrl);
  }

  // Has code = handle callback
  const tenantId = state;
  if (!tenantId) {
    return NextResponse.redirect(new URL('/login?error=sso_missing_state', request.url));
  }

  try {
    const ssoProvider = await getSSOProvider(providerName, tenantId);
    if (!ssoProvider) {
      return NextResponse.redirect(new URL('/login?error=sso_not_configured', request.url));
    }

    const claims = await ssoProvider.handleCallback(code);

    // Create or link Supabase user
    const supabase = createAdminClient();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === claims.email);

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new Supabase user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: claims.email,
        email_confirm: true,
        user_metadata: {
          full_name: claims.name,
          sso_provider: providerName,
          sso_sub: claims.sub,
        },
      });
      if (createError || !newUser.user) {
        throw new Error(`Failed to create user: ${createError?.message}`);
      }
      userId = newUser.user.id;
    }

    // Ensure tenant membership
    await supabase.from('tenant_members').upsert({
      user_id: userId,
      tenant_id: tenantId,
      role: 'member',
    }, { onConflict: 'user_id,tenant_id' });

    // Generate a magic link for the session (SSO users don't have passwords)
    const { data: magicLink, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: claims.email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/` },
    });

    if (linkError || !magicLink.properties?.action_link) {
      return NextResponse.redirect(new URL('/login?error=sso_session_failed', request.url));
    }

    return NextResponse.redirect(magicLink.properties.action_link);
  } catch (e: any) {
    console.error('[SSO] Callback error:', e);
    return NextResponse.redirect(new URL(`/login?error=sso_failed&detail=${encodeURIComponent(e.message)}`, request.url));
  }
}

/**
 * POST /api/v1/auth/sso/:provider
 * Saves SSO configuration for a tenant.
 * Body: { client_id, client_secret, issuer, enforce_sso?, azure_tenant_id? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { provider: providerName } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { client_id, client_secret, issuer, enforce_sso, azure_tenant_id } = body;
  if (!client_id || !client_secret || !issuer) {
    return NextResponse.json({ error: 'Required: client_id, client_secret, issuer' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('sso_configurations').upsert({
    tenant_id: tenantId,
    provider: providerName,
    config: { client_id, client_secret, issuer, azure_tenant_id },
    enforce_sso: enforce_sso ?? false,
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,provider' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: `${providerName} SSO configured successfully` });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getSSOProvider(providerName: string, tenantId: string): Promise<SSOProvider | null> {
  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from('sso_configurations')
    .select('config, provider')
    .eq('tenant_id', tenantId)
    .eq('provider', providerName)
    .eq('is_active', true)
    .single();

  if (!config) return null;

  const providerConfig = config.config as any;
  const redirectUri = buildRedirectUri(providerName);

  const commonConfig = {
    client_id: providerConfig.client_id,
    client_secret: providerConfig.client_secret,
    issuer: providerConfig.issuer,
    redirect_uri: redirectUri,
  };

  switch (providerName) {
    case 'okta':
      return new OktaSSOProvider(commonConfig);
    case 'entra':
      return new EntraSSOProvider(commonConfig, providerConfig.azure_tenant_id);
    case 'auth0':
      return new Auth0SSOProvider(commonConfig);
    default:
      return null;
  }
}
