import { calculateCost, PRICING } from '../src/cost-table';

describe('calculateCost', () => {
  test('known model cost matches manual calculation', () => {
    const cost = calculateCost('gpt-4o-mini', 1000, 500);
    const expected = (1000 * 0.15 + 500 * 0.60) / 1_000_000;
    expect(Math.abs(cost - expected)).toBeLessThan(1e-9);
  });

  test('cached tokens are billed at lower rate', () => {
    const noCacheCost = calculateCost('gpt-4o', 1000, 0, 0);
    const cachedCost  = calculateCost('gpt-4o', 1000, 0, 1000);
    expect(cachedCost).toBeLessThan(noCacheCost);
  });

  test('unknown model falls back to gpt-4o pricing', () => {
    const cost = calculateCost('unknown-model-xyz', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  test('all models have positive prices', () => {
    for (const [model, p] of Object.entries(PRICING)) {
      expect(p.input).toBeGreaterThan(0);
      expect(p.output).toBeGreaterThan(0);
      expect(p.cached).toBeGreaterThanOrEqual(0);
    }
  });

  test('reasoning tokens billed as output', () => {
    const withReasoning    = calculateCost('o1', 0, 0, 0, 1000);
    const withoutReasoning = calculateCost('o1', 0, 1000, 0, 0);
    expect(withReasoning).toBe(withoutReasoning);
  });
});
