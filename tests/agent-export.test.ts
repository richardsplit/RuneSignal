import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});

vi.mock('@/lib/db/supabase', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { GET } from '@/app/api/v1/agents/export/route';

function makeRequest(
  query: Record<string, string> = {},
  headers: Record<string, string> = {},
): NextRequest {
  const url = new URL('http://localhost:3000/api/v1/agents/export');
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return {
    url: url.toString(),
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

// We need the NextRequest type for the helper above
import type { NextRequest } from 'next/server';

describe('Agent Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 without tenant id', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('should return 400 for invalid format', async () => {
    const res = await GET(makeRequest({ format: 'xml' }, { 'x-tenant-id': 'tenant-1' }));
    expect(res.status).toBe(400);
  });

  it('should return JSON export by default', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);

      if (table === 'agent_inventory') {
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              name: 'Agent One',
              framework: 'langchain',
              status: 'active',
              risk_classification: 'low',
              eu_ai_act_category: 'minimal_risk',
              last_active_at: '2026-04-01T00:00:00Z',
              first_seen_at: '2026-01-01T00:00:00Z',
              owner_user_id: 'user-1',
              metadata: {},
            },
          ],
          error: null,
        });
      } else {
        // agent_credentials
        chain.eq = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'cred-1',
              agent_name: 'Legacy Agent',
              agent_type: 'custom',
              framework: 'custom',
              status: 'active',
              last_seen_at: '2026-03-01T00:00:00Z',
              created_at: '2025-12-01T00:00:00Z',
              metadata: {},
            },
          ],
          error: null,
        });
      }
      return chain;
    });

    const res = await GET(makeRequest({}, { 'x-tenant-id': 'tenant-1' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.agents).toHaveLength(2);
    expect(body.agents[0].agent_id).toBe('inv-1');
    expect(body.agents[1].agent_id).toBe('cred-1');
    expect(body.total).toBe(2);
  });

  it('should return CSV export with proper headers', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);

      if (table === 'agent_inventory') {
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              name: 'Agent One',
              framework: 'langchain',
              status: 'active',
              risk_classification: 'low',
              eu_ai_act_category: 'minimal_risk',
              last_active_at: null,
              first_seen_at: '2026-01-01T00:00:00Z',
              owner_user_id: null,
              metadata: {},
            },
          ],
          error: null,
        });
      } else {
        chain.eq = vi.fn().mockResolvedValue({ data: [], error: null });
      }
      return chain;
    });

    const res = await GET(makeRequest({ format: 'csv' }, { 'x-tenant-id': 'tenant-1' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/csv');
    expect(res.headers.get('content-disposition')).toContain('agent-registry-export.csv');

    const csv = await res.text();
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'agent_id,name,type,framework,status,risk_classification,eu_ai_act_category,last_active,registered_at,owner',
    );
    expect(lines.length).toBe(2); // header + 1 data row
  });
});
