import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @sentry/nextjs before importing the route
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
}));

// Mock crypto for key generation
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => Buffer.from('a'.repeat(24))),
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mocked-hash'),
    })),
  },
}));

const mockSupabaseFrom = vi.fn();
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: mockSupabaseFrom,
};

vi.mock('@lib/db/supabase', () => ({
  createServerClient: vi.fn(async () => mockSupabase),
}));

import * as Sentry from '@sentry/nextjs';
import { GET, POST, DELETE } from '../route';
import { NextRequest } from 'next/server';

function makeRequest(
  method: string,
  url = 'http://localhost/api/v1/keys',
  headers?: Record<string, string>,
  body?: Record<string, unknown>,
): NextRequest {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': 'test-tenant-123',
      ...headers,
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  return new NextRequest(url, opts as any);
}

describe('GET /api/v1/keys - Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
  });

  it('calls Sentry.captureException when supabase query fails', async () => {
    const dbError = { message: 'DB connection failed', code: '500' };
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: dbError }),
    });

    const req = makeRequest('GET');
    const res = await GET(req);

    expect(res.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({
        tags: expect.objectContaining({
          route: '/api/v1/keys',
          method: 'GET',
          component: 'keys',
        }),
      }),
    );
  });

  it('does not call Sentry.captureException on success', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const req = makeRequest('GET');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/keys - Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
  });

  it('calls Sentry.captureException when key creation fails', async () => {
    const dbError = new Error('Insert failed');
    mockSupabaseFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
    });

    const req = makeRequest('POST', undefined, undefined, { name: 'Test Key' });
    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          route: '/api/v1/keys',
          method: 'POST',
          component: 'keys',
        }),
      }),
    );
  });
});

describe('DELETE /api/v1/keys - Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
  });

  it('calls Sentry.captureException when key deletion fails', async () => {
    const dbError = { message: 'Delete failed', code: '500' };
    mockSupabaseFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    });
    // Make the chained .eq().eq() return the error
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: dbError }),
      }),
    };
    mockSupabaseFrom.mockReturnValue(deleteChain);

    const req = makeRequest('DELETE', 'http://localhost/api/v1/keys?id=key-1');
    const res = await DELETE(req);

    expect(res.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({
        tags: expect.objectContaining({
          route: '/api/v1/keys',
          method: 'DELETE',
          component: 'keys',
        }),
      }),
    );
  });
});
