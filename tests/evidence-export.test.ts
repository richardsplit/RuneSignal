import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mocks are available in the hoisted vi.mock factories
const { mockGenerate, mockComputeArticleCoverage, mockInsert, mockIsoGenerate } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockComputeArticleCoverage: vi.fn(),
  mockInsert: vi.fn(),
  mockIsoGenerate: vi.fn(),
}));

vi.mock('@lib/modules/compliance/eu-ai-act-report', () => ({
  EuAiActReportGenerator: {
    generate: mockGenerate,
    computeArticleCoverage: mockComputeArticleCoverage,
  },
}));

vi.mock('@lib/modules/compliance/iso-42001-report', () => ({
  Iso42001ReportGenerator: {
    generate: mockIsoGenerate,
    computeClauseCoverage: vi.fn(),
  },
}));

vi.mock('@/lib/db/supabase', () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.not = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.range = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.catch = vi.fn(() => ({ data: null }));
      chain.insert = vi.fn((...args: any[]) => {
        mockInsert(...args);
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'rpt_test_123', generated_at: new Date().toISOString() },
              error: null,
            }),
          }),
        };
      });
      return chain;
    },
  }),
}));

// Mock ledger signer (used by EvidenceService)
vi.mock('@lib/ledger/signer', () => ({
  getLedgerSigner: vi.fn(() => ({
    sign: vi.fn(() => 'mock-signature-base64'),
  })),
}));

// Mock audit ledger service (used by EvidenceService)
vi.mock('@lib/ledger/service', () => ({
  AuditLedgerService: {
    appendEvent: vi.fn().mockResolvedValue({ id: 'mock-event-id' }),
  },
}));

import { POST } from '@/app/api/v1/compliance/evidence-export/route';

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost:3000/api/v1/compliance/evidence-export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const MOCK_REPORT = {
  report_metadata: {
    generated_at: '2026-04-01T00:00:00.000Z',
    framework: 'EU AI Act (Regulation 2024/1689)',
    enforcement_date: '2026-08-02',
    organization: { id: 'test-tenant', name: 'Test Org' },
    evidence_period: { from: '2026-01-01', to: '2026-03-31' },
    report_id: 'rpt_mock',
    cryptographic_integrity: {
      ledger_root_hash: 'abc123',
      verification_instruction: 'SHA-256 hash chain',
    },
  },
  article_coverage: {
    article_13_transparency: { status: 'covered', evidence_count: 10, evidence_refs: [], notes: '' },
    article_14_human_oversight: { status: 'covered', hitl_reviews: 5, avg_review_time_minutes: 12, overrides_by_humans: 1, evidence_refs: [] },
    article_17_quality_management: { status: 'covered', policy_version: '1.0', anomalies_detected: 0, remediation_actions: 0 },
    article_26_deployer_obligations: { status: 'covered', agent_inventory_count: 3, risk_classifications: { low: 2, high: 1 }, third_party_models: ['gpt-4o'] },
  },
  agent_inventory: [{ id: 'a1', name: 'Agent 1', framework: 'langgraph', risk_classification: 'low', eu_ai_act_category: 'limited', status: 'active', last_active_at: null }],
  action_ledger_summary: { total_actions: 100, cryptographically_signed: 95, coverage_percentage: 95, highest_risk_actions: [] },
  hitl_review_log: [],
  incidents: [],
  attestation: { signed_by: 'RuneSignal Compliance Engine v1.0', signature: 'sig_mock', timestamp: '2026-04-01T00:00:00.000Z' },
};

describe('POST /api/v1/compliance/evidence-export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerate.mockResolvedValue(MOCK_REPORT);
    mockComputeArticleCoverage.mockReturnValue({
      art_13: true,
      art_14: true,
      art_17: true,
      art_26: true,
    });
  });

  it('returns 400 when date_range is missing', async () => {
    const req = makeRequest(
      { regulation: 'eu_ai_act' },
      { 'x-tenant-id': 'test-tenant' },
    );
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/date_range/);
  });

  it('returns 400 when regulation is missing', async () => {
    const req = makeRequest(
      { date_range: { start: '2026-01-01', end: '2026-03-31' } },
      { 'x-tenant-id': 'test-tenant' },
    );
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/regulation/);
  });

  it('returns 400 for invalid regulation value', async () => {
    const req = makeRequest(
      { date_range: { start: '2026-01-01', end: '2026-03-31' }, regulation: 'hipaa' },
      { 'x-tenant-id': 'test-tenant' },
    );
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid regulation/);
  });

  it('returns 401 when no tenant context is provided', async () => {
    const req = makeRequest({
      date_range: { start: '2026-01-01', end: '2026-03-31' },
      regulation: 'eu_ai_act',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Tenant ID required/);
  });

  it('returns 200 with evidence manifest for eu_ai_act', async () => {
    const req = makeRequest(
      { date_range: { start: '2026-01-01', end: '2026-03-31' }, regulation: 'eu_ai_act' },
      { 'x-tenant-id': 'test-tenant' },
    );
    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.export_id).toBeDefined();
    expect(data.regulation).toBe('eu_ai_act');
    expect(data.status).toBe('ready');
    expect(data.evidence_manifest).toBeDefined();
    expect(data.evidence_manifest.article_coverage).toBeDefined();
    expect(data.evidence_manifest.report_metadata.framework).toContain('EU AI Act');
  });

  it('delegates to EuAiActReportGenerator.generate with correct params', async () => {
    const req = makeRequest(
      { date_range: { start: '2026-01-01T00:00:00Z', end: '2026-03-31T23:59:59Z' }, regulation: 'eu_ai_act' },
      { 'x-tenant-id': 'my-tenant-uuid' },
    );
    await POST(req as any);

    expect(mockGenerate).toHaveBeenCalledOnce();
    expect(mockGenerate).toHaveBeenCalledWith('my-tenant-uuid', {
      period_start: '2026-01-01T00:00:00Z',
      period_end: '2026-03-31T23:59:59Z',
      framework: 'EU_AI_ACT_2024',
    });
  });

  it('resolves tenant from body tenant_id when no header is set', async () => {
    const req = makeRequest({
      tenant_id: 'body-tenant-id',
      date_range: { start: '2026-01-01', end: '2026-03-31' },
      regulation: 'eu_ai_act',
    });
    await POST(req as any);

    expect(mockGenerate).toHaveBeenCalledWith('body-tenant-id', expect.any(Object));
  });

  it('stores the report in compliance_reports table via EvidenceService', async () => {
    const req = makeRequest(
      { date_range: { start: '2026-01-01', end: '2026-03-31' }, regulation: 'eu_ai_act' },
      { 'x-tenant-id': 'test-tenant' },
    );
    await POST(req as any);

    // EvidenceService.generate() calls insert internally
    expect(mockInsert).toHaveBeenCalled();
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.org_id).toBe('test-tenant');
    expect(insertArg.regulation).toBe('eu_ai_act');
    expect(insertArg.status).toBe('ready');
    expect(insertArg.evidence_period_start).toBe('2026-01-01');
    expect(insertArg.evidence_period_end).toBe('2026-03-31');
    expect(insertArg.attestation_signature).toBeDefined();
  });

  it('does not fall back to demo-tenant', async () => {
    const req = makeRequest({
      date_range: { start: '2026-01-01', end: '2026-03-31' },
      regulation: 'eu_ai_act',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
