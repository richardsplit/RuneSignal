import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createMiddlewareClient } from './lib/db/supabase';

// Initialize Redis and Ratelimit (static instance for edge efficiency)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'), // 100 requests per minute per tenant
  analytics: true,
});

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname;
  const requestId = uuidv4();
  const response = NextResponse.next();
  response.headers.set('X-Request-Id', requestId);

  // Initialize Supabase Middleware Client for SSR
  const supabase = createMiddlewareClient(request, response);

  // 1. Skip auth for static/public assets and public routes
  const isPublicApi = url.startsWith('/api/health') || url.startsWith('/api/v1/verify/pubkey');
  const isRoot = url === '/';           // landing page lives at /
  const isLogin = url.startsWith('/login');
  const isLanding = url.startsWith('/landing'); // legacy /landing redirect safety
  const isLegal = url.startsWith('/legal');     // /legal/dpa, /legal/sla — public
  const isSecurity = url.startsWith('/security'); // /security — architecture trust document, public
  const isMfaVerify = url.startsWith('/mfa-verify');
  const isOnboarding = url.startsWith('/onboarding');
  const isInternal = url.startsWith('/_next') || url.includes('.') || url.startsWith('/api/v1/billing/webhook');

  // Static assets and fully public non-root routes — skip all auth processing
  if (isPublicApi || isLogin || isLanding || isLegal || isSecurity || isInternal) {
    return response;
  }

  // 2. Auth Check (Supabase SSR)
  const { data: { user } } = await supabase.auth.getUser();

  // Root / is the public landing page — but redirect already-authenticated users to dashboard
  if (isRoot) {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // 2.1 API Key Verification (For Agent/Machine access)
  const authHeader = request.headers.get('Authorization');
  let apiKeyTenantId: string | null = null;

  if (authHeader?.startsWith('Bearer tl_')) {
    const apiKey = authHeader.split(' ')[1];
    
    if (apiKey) {
      // Hash key using Web Crypto (Edge compatible)
      const msgUint8 = new TextEncoder().encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Use service role for internal lookup bypassing RLS on api_keys
      const { data: keyRecord } = await supabase
        .from('api_keys')
        .select('tenant_id, is_active')
        .eq('key_hash', hashHex)
        .eq('is_active', true)
        .single();

      if (keyRecord && typeof keyRecord.tenant_id === 'string') {
        apiKeyTenantId = keyRecord.tenant_id;
        response.headers.set('X-Tenant-Id', apiKeyTenantId);
      } else {
        return NextResponse.json({ error: 'Unauthorized', message: 'Invalid API Key' }, { status: 401 });
      }
    }
  }

  // If unauthenticated (no user and no valid API key) and on a protected dashboard route, redirect to homepage
  if (!user && !apiKeyTenantId && !url.startsWith('/api')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2.3 Usage Tracking & Metering (Phase 3)
  // Increment API call counts for billable governance routes
  if (apiKeyTenantId && url.startsWith('/api/v1')) {
    const billableRoutes = ['/api/v1/provenance', '/api/v1/intent', '/api/v1/moral', '/api/v1/verify', '/api/v1/enforce', '/api/v1/firewall'];
    const isBillable = billableRoutes.some(route => url.startsWith(route));
    
    if (isBillable) {
      // Use service role for incrementing count (fire and forget for latency)
      supabase.rpc('increment_api_usage', { t_id: apiKeyTenantId }).then(({ error }) => {
        if (error) console.error('Usage Tracking Error:', error.message);
      });

      const PLAN_LIMITS: Record<string, number> = {
        free: 1000,
        starter: 50000,
        pro: 500000,
        enterprise: Infinity,
        past_due: 0,
      };

      // Check plan limits (non-blocking read, cached for 60s via Supabase)
      const { data: tenantUsage } = await supabase
        .from('tenants')
        .select('plan_tier, api_requests_monthly')
        .eq('id', apiKeyTenantId)
        .single();

      if (tenantUsage) {
        const limit = PLAN_LIMITS[tenantUsage.plan_tier || 'free'] ?? 1000;
        if ((tenantUsage.api_requests_monthly || 0) >= limit) {
          return NextResponse.json(
            {
              error: 'Monthly API limit reached',
              plan: tenantUsage.plan_tier,
              limit,
              used: tenantUsage.api_requests_monthly,
              upgrade_url: `${request.nextUrl.origin}/billing`
            },
            { status: 429 }
          );
        }
      }
    }
  }

  // 2.4 MFA Enforcement (Authenticator Assurance Level 2)
  // Use the correct Supabase API: getAuthenticatorAssuranceLevel() reads the JWT
  // directly (no extra DB call). It returns currentLevel (what the session has)
  // and nextLevel (what it could reach if MFA is completed).
  // If nextLevel is 'aal2' but currentLevel is not, the user has a verified TOTP
  // factor enrolled but has not yet completed the challenge in this session — they
  // must go through /mfa-verify before accessing any protected route.
  //
  // NOTE: do NOT use session?.user?.app_metadata?.aal — Supabase does not write
  // AAL into app_metadata. That field is always undefined and caused an infinite
  // redirect loop in the previous implementation.
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsMfaChallenge =
    aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2';

  if (needsMfaChallenge && !isMfaVerify && !url.startsWith('/login') && !url.startsWith('/landing') && !url.startsWith('/security') && !url.startsWith('/api')) {
    return NextResponse.redirect(new URL('/mfa-verify', request.url));
  }

  // If unauthenticated on a protected API route (excluding /api/v1 agent routes handled later)
  if (!user && url.startsWith('/api') && !url.startsWith('/api/v1')) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Valid dashboard session required' }, { status: 401 });
  }

  // 3. User Context & Multi-Tenancy (For logged in users)
  if (user) {
    // 3.1 Fetch Tenant ID for this user from DB or app_metadata
    // For production performance, we'd check user.app_metadata or a cached mapping.
    // For Phase 1 implementation, we fetch from tenant_members.
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const tenantId = membership?.tenant_id;

    // If login is successful but no tenant exists, redirect to onboarding (except if already on onboarding)
    if (!tenantId && !isOnboarding && !url.startsWith('/api')) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    if (tenantId) {
      response.headers.set('X-Tenant-Id', tenantId);

      // 4. Rate Limiting (Upstash Redis) based on Tenant
      const { success, limit, reset, remaining } = await ratelimit.limit(tenantId);
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', reset.toString());

      if (!success) {
        return NextResponse.json(
          { error: 'Too Many Requests', message: 'Rate limit exceeded.' },
          { status: 429, headers: response.headers }
        );
      }
    }
  }

  // 5. Agent-only /api/v1 Authorization (Scoped to sensitive agent-only routes)
  // This part still allows legacy agent auth via headers if it's an agent API call.
  if (url.startsWith('/api/v1/')) {
    const sensitiveAgentRoutes = ['/api/v1/provenance/certify', '/api/v1/intent', '/api/v1/enforce/tool-call', '/api/v1/moral/evaluate', '/api/v1/firewall/evaluate'];
    const isSensitive = sensitiveAgentRoutes.some(route => url.startsWith(route));

    // Agent calls use Service Role or specific Agent keys (simplified for now to check headers)
    const agentId = request.headers.get('X-Agent-Id');

    if (isSensitive && !agentId && !user) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Agent identity or user session required' },
        { status: 403, headers: response.headers }
      );
    }
  }

  // Protect all dashboard routes — require Supabase session
  if (
    !url.startsWith('/api') &&
    url !== '/' &&
    !url.startsWith('/login') &&
    !url.startsWith('/landing') &&
    !url.startsWith('/legal') &&
    !url.startsWith('/security') &&
    !url.startsWith('/mfa-verify') &&
    !url.startsWith('/onboarding') &&
    !url.startsWith('/_next') &&
    !url.startsWith('/public')
  ) {
    const { createServerClient } = await import('./lib/db/supabase');
    const supabaseSessionClient = await createServerClient();
    const { data: { session: dashboardSession } } = await supabaseSessionClient.auth.getSession();
    if (!dashboardSession) {
      const homeUrl = new URL('/', request.url);
      homeUrl.searchParams.set('redirect', url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
