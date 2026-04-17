import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @sentry/nextjs before importing the route
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
}));

// Mock supabase admin client
vi.mock('@/lib/db/supabase', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      catch: vi.fn(() => ({ data: null })),
    })),
  })),
}));

// Mock report generators to throw
vi.mock('@lib/modules/compliance/eu-ai-act-report', () => ({
  EuAiActReportGenerator: {
    generate: vi.fn(),
    computeArticleCoverage: vi.fn(),
  },
}));

vi.mock('@lib/modules/compliance/iso-42001-report', () => ({
  Iso42001ReportGenerator: {
    generate: vi.fn(),
    computeClauseCoverage: vi.fn(),
  },
}));

import * as Sentry from '@sentry/nextjs';
import { POST } from '../route';
import { EuAiActReportGenerator } from '@lib/modules/compliance/eu-ai-act-report';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/v1/compliance/evidence-export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': 'test-tenant-123',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/compliance/evidence-export - Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Sentry.captureException when report generation throws', async () => {
    const testError = new Error('Report generation failed');
    vi.mocked(EuAiActReportGenerator.generate).mockRejectedValueOnce(testError);

    const req = makeRequest({
      date_range: { start: '2024-01-01', end: '2024-12-31' },
      regulation: 'eu_ai_act',
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Internal server error');

    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        tags: expect.objectContaining({
          route: '/api/v1/compliance/evidence-export',
          component: 'evidence-export',
        }),
      }),
    );
  });

  it('does not call Sentry.captureException on successful requests', async () => {
    vi.mocked(EuAiActReportGenerator.generate).mockResolvedValueOnce({
      report_metadata: { report_id: 'test-id' },
      agent_inventory: [],
      action_ledger_summary: { total_actions: 0, coverage_percentage: 0 },
      hitl_review_log: [],
    } as any);
    vi.mocked(EuAiActReportGenerator.computeArticleCoverage).mockReturnValueOnce({} as any);

    const req = makeRequest({
      date_range: { start: '2024-01-01', end: '2024-12-31' },
      regulation: 'eu_ai_act',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('does not call Sentry.captureException on validation errors', async () => {
    const req = makeRequest({
      date_range: { start: '2024-01-01', end: '2024-12-31' },
      // missing regulation
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
