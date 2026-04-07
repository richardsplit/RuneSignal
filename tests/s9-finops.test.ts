import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinOpsService } from '../lib/modules/s9-finops/service';

vi.mock('../lib/db/supabase', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({
            data: [{ budget_usd: '10.00', spent_usd: '9.00', hard_block: true, alert_at: '0.8' }]
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({}))
    })),
    rpc: vi.fn(() => Promise.resolve({}))
  }))
}));

describe('FinOpsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow call if budget is under limits', async () => {
    const res = await FinOpsService.checkBudget('tenant-1', 'agent-1', 100, 'gpt-4o-mini');
    expect(res.allowed).toBe(true);
    expect(res.remainingUsd).toBe(1.00); 
  });

  it('should record cost accurately', async () => {
    const cost = await FinOpsService.recordCost('tenant-1', 'agent-1', 'gpt-4o', 1000, 500);
    expect(cost).toBe(0.005 + 0.0075);
  });
});
