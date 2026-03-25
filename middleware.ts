import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JwtHandler } from './auth/jwt';
import { v4 as uuidv4 } from 'uuid';

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

  // Public endpoints bypass Auth
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
      response.headers.set('X-Tenant-Id', decoded.tenant_id);
      
      // If it's an agent token
      if ('agent_id' in decoded) {
        response.headers.set('X-Agent-Id', decoded.agent_id);
      }
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid token' },
      { status: 401, headers: response.headers }
    );
  }

  // NOTE: A real Redis-backed rate limiter is needed for production here
  
  return response;
}

// Config ensures middleware only runs on API paths (optional)
export const config = {
  matcher: '/api/:path*',
};
