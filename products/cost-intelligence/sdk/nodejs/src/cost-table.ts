/**
 * Model pricing table — USD per 1M tokens.
 * Prices correct as of May 2026. Update with each minor release.
 */
export interface ModelPricing {
  input: number;   // USD / 1M input tokens
  output: number;  // USD / 1M output tokens
  cached: number;  // USD / 1M cached input tokens
}

export const PRICING: Record<string, ModelPricing> = {
  // ── OpenAI ───────────────────────────────────────────────────────────────────
  "gpt-4o":                  { input: 2.50,  output: 10.00, cached: 1.25 },
  "gpt-4o-2024-11-20":       { input: 2.50,  output: 10.00, cached: 1.25 },
  "gpt-4o-2024-08-06":       { input: 2.50,  output: 10.00, cached: 1.25 },
  "gpt-4o-mini":             { input: 0.15,  output: 0.60,  cached: 0.075 },
  "gpt-4o-mini-2024-07-18":  { input: 0.15,  output: 0.60,  cached: 0.075 },
  "gpt-4.1":                 { input: 2.00,  output: 8.00,  cached: 0.50 },
  "gpt-4.1-mini":            { input: 0.40,  output: 1.60,  cached: 0.10 },
  "gpt-4.1-nano":            { input: 0.10,  output: 0.40,  cached: 0.025 },
  "o1":                      { input: 15.00, output: 60.00, cached: 7.50 },
  "o1-mini":                 { input: 1.10,  output: 4.40,  cached: 0.55 },
  "o3":                      { input: 10.00, output: 40.00, cached: 2.50 },
  "o3-mini":                 { input: 1.10,  output: 4.40,  cached: 0.55 },
  "o4-mini":                 { input: 1.10,  output: 4.40,  cached: 0.275 },

  // ── Anthropic ────────────────────────────────────────────────────────────────
  "claude-3-5-sonnet-20241022": { input: 3.00,  output: 15.00, cached: 0.30 },
  "claude-3-5-sonnet":          { input: 3.00,  output: 15.00, cached: 0.30 },
  "claude-3-5-haiku":           { input: 0.80,  output: 4.00,  cached: 0.08 },
  "claude-3-5-haiku-20241022":  { input: 0.80,  output: 4.00,  cached: 0.08 },
  "claude-3-opus":              { input: 15.00, output: 75.00, cached: 1.50 },
  "claude-opus-4":              { input: 15.00, output: 75.00, cached: 1.50 },
  "claude-sonnet-4":            { input: 3.00,  output: 15.00, cached: 0.30 },

  // ── Google Gemini ────────────────────────────────────────────────────────────
  "gemini-2.5-pro":             { input: 1.25,  output: 10.00, cached: 0.315 },
  "gemini-2.5-flash":           { input: 0.15,  output: 0.60,  cached: 0.0375 },
  "gemini-2.0-flash":           { input: 0.10,  output: 0.40,  cached: 0.025 },
  "gemini-1.5-pro":             { input: 1.25,  output: 5.00,  cached: 0.3125 },
  "gemini-1.5-flash":           { input: 0.075, output: 0.30,  cached: 0.01875 },
};

const FALLBACK: ModelPricing = PRICING["gpt-4o"];

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0,
  reasoningTokens = 0,
): number {
  const p = PRICING[model] ?? FALLBACK;
  const billableInput = Math.max(0, inputTokens - cachedTokens);
  return (
    (billableInput * p.input +
      cachedTokens * p.cached +
      (outputTokens + reasoningTokens) * p.output) /
    1_000_000
  );
}
