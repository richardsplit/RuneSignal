import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JwtHandler } from './lib/auth/jwt';
import { v4 as uuidv4 } from 'uuid';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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
  
  // Create a base response so we can mutate headers before returning
  const response = NextResponse.next();
  // Inject Request ID to all responses
  const requestId = uuidv4();
  response.headers.set('X-Request-Id', requestId);

  // We only intercept API calls
  if (!url.startsWith('/api')) {
    return response;
  }

  // Public endpoints bypass Auth & Rate Limiting (except health maybe, but let's keep it simple)
  if (url.startsWith('/api/health') || url.startsWith('/api/v1/verify/pubkey')) {
    return response;
  }

  // 1. Auth check
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing Bearer token' },
      { status: 401, headers: response.headers }
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await JwtHandler.verifyToken(token);
    
    // Inject decoded info so downstream handlers can access it via headers
    if ('tenant_id' in decoded) {
      const tenantId = decoded.tenant_id as string;
      response.headers.set('X-Tenant-Id', tenantId);
      
      // 2. Rate Limiting (Upstash Redis)
      const { success, limit, reset, remaining } = await ratelimit.limit(tenantId);
      
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', reset.toString());

      if (!success) {
        return NextResponse.json(
          { error: 'Too Many Requests', message: 'Rate limit exceeded. Upgrade your plan for higher throughput.' },
          { status: 429, headers: response.headers }
        );
      }

      // 3. X-Agent-Id Enforcement for v1 routes
      if (url.startsWith('/api/v1/')) {
        const agentId = (decoded as any).agent_id;
        if (!agentId) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Agent ID missing in token. All v1 calls must be made by a registered agent.' },
            { status: 403, headers: response.headers }
          );
        }
        response.headers.set('X-Agent-Id', agentId);
      }
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid token' },
      { status: 401, headers: response.headers }
    );
  }

  return response;
}

// Config ensures middleware only runs on API paths (optional)
export const config = {
  matcher: '/api/:path*',
};
