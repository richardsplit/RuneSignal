import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFrom, mockAppendEvent } = vi.hoisted(() => {
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);

  const mockFrom = vi.fn().mockReturnValue(chain);
  const mockAppendEvent = vi.fn().mockResolvedValue({ id: 'mock-event-id' });

  return { mockFrom, mockAppendEvent, chain };
});

vi.mock('@lib/db/supabase', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@lib/ledger/service', () => ({
  AuditLedgerService: {
    appendEvent: mockAppendEvent,
  },
}));

vi.mock('@lib/ledger/signer', () => ({
  getLedgerSigner: vi.fn(() => ({
    sign: vi.fn(() => 'mock-signature'),
  })),
}));

import {
  AgentClassificationService,
  type EuAiActCategory,
} from '@lib/services/agent-classification-service';

// Helper to build mock chain responses per table
function setupMockChain(tableResponses: Record<string, { data: any; error: any; count?: number }>) {
  mockFrom.mockImplementation((table: string) => {
    const resp = tableResponses[table] || { data: null, error: null };
    const chain: Record<string, any> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.range = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: resp.data, error: resp.error });
    chain.update = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    // For count queries
    (chain as any).count = resp.count ?? 0;
    // Override select to inject count for behavior queries
    chain.select = vi.fn().mockReturnValue({
      ...chain,
      eq: vi.fn().mockReturnValue({
        ...chain,
        eq: vi.fn().mockResolvedValue({ data: resp.data, error: resp.error, count: resp.count ?? 0 }),
        single: vi.fn().mockResolvedValue({ data: resp.data, error: resp.error }),
      }),
      single: vi.fn().mockResolvedValue({ data: resp.data, error: resp.error }),
    });
    return chain;
  });
}

describe('AgentClassificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify an agent with healthcare keyword as high_risk', async () => {
    // Setup mock data: agent_inventory returns agent with healthcare description
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({
        data:
          table === 'agent_inventory'
            ? {
                id: 'agent-1',
                name: 'Healthcare Triage Bot',
                description: 'Triages healthcare claims',
                framework: 'langchain',
                eu_ai_act_category: 'unclassified',
                metadata: {},
              }
            : null,
        error: null,
        count: 0,
      });
      return chain;
    });

    const result = await AgentClassificationService.classify('tenant-1', 'agent-1');

    expect(result.new_category).toBe('high_risk');
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.reasoning[0]).toContain('healthcare');
    expect(result.is_manual_override).toBe(false);
  });

  it('should classify an agent with social scoring keyword as prohibited', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({
        data:
          table === 'agent_inventory'
            ? {
                id: 'agent-2',
                name: 'Social Scoring Evaluator',
                description: 'Evaluates citizen social scoring metrics',
                framework: 'custom',
                eu_ai_act_category: 'unclassified',
                metadata: {},
              }
            : null,
        error: null,
        count: 0,
      });
      return chain;
    });

    const result = await AgentClassificationService.classify('tenant-1', 'agent-2');

    expect(result.new_category).toBe('prohibited');
    expect(result.confidence).toBe('high');
    expect(result.reasoning[0]).toContain('Article 5');
  });

  it('should classify a chatbot as limited_risk', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({
        data:
          table === 'agent_inventory'
            ? {
                id: 'agent-3',
                name: 'Support Chatbot',
                description: 'Customer chatbot for FAQ',
                framework: 'langchain',
                eu_ai_act_category: 'unclassified',
                metadata: {},
              }
            : null,
        error: null,
        count: 0,
      });
      return chain;
    });

    const result = await AgentClassificationService.classify('tenant-1', 'agent-3');

    expect(result.new_category).toBe('limited_risk');
    expect(result.reasoning[0]).toContain('Article 52');
  });

  it('should default to minimal_risk for internal tooling', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({
        data:
          table === 'agent_inventory'
            ? {
                id: 'agent-4',
                name: 'Log Parser',
                description: 'Internal log aggregation tool',
                framework: 'custom',
                eu_ai_act_category: 'unclassified',
                metadata: {},
              }
            : null,
        error: null,
        count: 0,
      });
      return chain;
    });

    const result = await AgentClassificationService.classify('tenant-1', 'agent-4');

    expect(result.new_category).toBe('minimal_risk');
    expect(result.confidence).toBe('low');
  });

  it('should respect manual override and skip reclassification', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({
        data:
          table === 'agent_inventory'
            ? {
                id: 'agent-5',
                name: 'Healthcare Bot',
                description: 'healthcare decision maker',
                framework: 'langchain',
                eu_ai_act_category: 'minimal_risk',
                metadata: {
                  classification_manual_override: true,
                  classified_at: '2026-01-01T00:00:00Z',
                },
              }
            : null,
        error: null,
      });
      return chain;
    });

    const result = await AgentClassificationService.classify('tenant-1', 'agent-5');

    expect(result.new_category).toBe('minimal_risk');
    expect(result.is_manual_override).toBe(true);
    expect(result.reasoning[0]).toContain('Manual override');
  });

  it('should throw when agent is not found', async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
      return chain;
    });

    await expect(
      AgentClassificationService.classify('tenant-1', 'nonexistent'),
    ).rejects.toThrow('Agent not found');
  });

  it('setManualOverride should update metadata with override flag', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({
        data:
          table === 'agent_inventory'
            ? {
                id: 'agent-6',
                eu_ai_act_category: 'unclassified',
                metadata: {},
              }
            : null,
        error: null,
      });
      chain.update = mockUpdate;
      return chain;
    });

    await AgentClassificationService.setManualOverride(
      'tenant-1',
      'agent-6',
      'high_risk',
      'Compliance team review',
    );

    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.eu_ai_act_category).toBe('high_risk');
    expect(updateArg.metadata.classification_manual_override).toBe(true);
    expect(updateArg.metadata.classification_manual_reason).toBe('Compliance team review');
  });

  it('classifyAll should classify all non-decommissioned agents', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);

      if (table === 'agent_inventory') {
        chain.neq = vi.fn().mockResolvedValue({
          data: [{ id: 'agent-a' }, { id: 'agent-b' }],
          error: null,
        });
        chain.single = vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            data: {
              id: callCount === 1 ? 'agent-a' : 'agent-b',
              name: 'Test Agent',
              description: 'Internal tool',
              framework: 'custom',
              eu_ai_act_category: 'unclassified',
              metadata: {},
            },
            error: null,
            count: 0,
          });
        });
      } else {
        chain.single = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 });
      }
      return chain;
    });

    const results = await AgentClassificationService.classifyAll('tenant-1');

    expect(results.length).toBe(2);
  });
});
