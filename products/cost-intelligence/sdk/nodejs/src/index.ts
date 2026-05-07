/**
 * @runesignal/sdk — AI Cost Intelligence SDK for Node.js
 *
 * @example
 * ```ts
 * import RuneSignal from '@runesignal/sdk';
 *
 * RuneSignal.configure({ apiKey: 'rs_live_YOUR_KEY' });
 *
 * const response = await openai.chat.completions.create({ ... });
 * RuneSignal.log(response, { customerId: user.id, featureTag: 'summarize' });
 * ```
 */

import { calculateCost, PRICING } from './cost-table';
import { ship } from './transport';
import type {
  RuneSignalConfig,
  TrackOptions,
  LLMResponse,
  OpenAILikeResponse,
  AnthropicLikeResponse,
  InferenceLog,
} from './types';

export type { RuneSignalConfig, TrackOptions, LLMResponse, InferenceLog };
export { calculateCost, PRICING };

export const VERSION = '0.2.0';

// ── Internal state ──────────────────────────────────────────────────────────
let _apiKey: string | null = null;
let _baseUrl: string | null = null;
let _enabled = true;

// ── Config ───────────────────────────────────────────────────────────────────

/**
 * Initialise the SDK. Call once at app startup.
 */
export function configure(config: RuneSignalConfig): void {
  _apiKey = config.apiKey ?? process.env['RUNESIGNAL_API_KEY'] ?? null;
  _baseUrl = config.baseUrl ?? process.env['RUNESIGNAL_BASE_URL'] ?? null;
  _enabled = config.enabled !== false;
}

/**
 * Returns the RuneSignal OpenAI-compatible proxy base URL.
 * Drop it into `openai.baseURL` and policy enforcement applies automatically.
 */
export function proxyUrl(): string {
  const base = _baseUrl ?? 'https://api.runesignal.com';
  return `${base.replace(/\/$/, '')}/proxy/openai/v1`;
}

// ── Response parsing ─────────────────────────────────────────────────────────

function isAnthropicResponse(r: LLMResponse): r is AnthropicLikeResponse {
  return 'usage' in r && typeof (r as AnthropicLikeResponse).usage?.input_tokens === 'number';
}

function extractTokens(response: LLMResponse): {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  requestId: string | null;
} {
  if (isAnthropicResponse(response)) {
    const u = response.usage ?? {};
    return {
      model: response.model ?? 'unknown',
      provider: 'anthropic',
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      cachedTokens: u.cache_read_input_tokens ?? 0,
      reasoningTokens: 0,
      requestId: response.id ?? null,
    };
  }

  const u = (response as OpenAILikeResponse).usage ?? {};
  return {
    model: (response as OpenAILikeResponse).model ?? 'unknown',
    provider: 'openai',
    inputTokens: u.prompt_tokens ?? 0,
    outputTokens: u.completion_tokens ?? 0,
    cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0,
    reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
    requestId: (response as OpenAILikeResponse).id ?? null,
  };
}

// ── Core API ─────────────────────────────────────────────────────────────────

/**
 * Log an LLM response. Call immediately after your LLM call.
 * Shipping is fire-and-forget — this function returns synchronously.
 *
 * @param response  The raw response from openai / anthropic / etc.
 * @param options   Attribution metadata
 */
export function log(response: LLMResponse, options: TrackOptions = {}): void {
  if (!_enabled) return;

  const key = _apiKey ?? process.env['RUNESIGNAL_API_KEY'];
  if (!key) return; // not configured — silent no-op

  try {
    const tokens = extractTokens(response);
    const cost = calculateCost(
      tokens.model,
      tokens.inputTokens,
      tokens.outputTokens,
      tokens.cachedTokens,
      tokens.reasoningTokens,
    );

    const payload: InferenceLog = {
      customer_id: options.customerId ?? null,
      feature_tag: options.featureTag ?? null,
      endpoint_id: options.endpointId ?? null,
      model: tokens.model,
      provider: tokens.provider,
      input_tokens: tokens.inputTokens,
      output_tokens: tokens.outputTokens,
      cached_tokens: tokens.cachedTokens,
      reasoning_tokens: tokens.reasoningTokens,
      cost_usd: cost,
      latency_ms: 0, // not measurable here — use track() wrapper for latency
      request_id: tokens.requestId,
    };

    ship(payload, key, _baseUrl ?? undefined);
  } catch {
    // Never surface errors to caller
  }
}

/**
 * Wrap any async function that calls an LLM. Captures latency automatically.
 *
 * @example
 * ```ts
 * const summarize = RuneSignal.track(
 *   async (text: string) => {
 *     const res = await openai.chat.completions.create({ ... });
 *     return res;
 *   },
 *   { customerId: userId, featureTag: 'summarize' }
 * );
 * ```
 */
export function track<T extends LLMResponse, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options: TrackOptions = {},
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const t0 = Date.now();
    const response = await fn(...args);
    const latencyMs = Date.now() - t0;

    if (_enabled) {
      const key = _apiKey ?? process.env['RUNESIGNAL_API_KEY'];
      if (key) {
        try {
          const tokens = extractTokens(response);
          const cost = calculateCost(
            tokens.model,
            tokens.inputTokens,
            tokens.outputTokens,
            tokens.cachedTokens,
            tokens.reasoningTokens,
          );

          ship({
            customer_id: options.customerId ?? null,
            feature_tag: options.featureTag ?? null,
            endpoint_id: options.endpointId ?? null,
            model: tokens.model,
            provider: tokens.provider,
            input_tokens: tokens.inputTokens,
            output_tokens: tokens.outputTokens,
            cached_tokens: tokens.cachedTokens,
            reasoning_tokens: tokens.reasoningTokens,
            cost_usd: cost,
            latency_ms: latencyMs,
            request_id: tokens.requestId,
          }, key, _baseUrl ?? undefined);
        } catch {
          // Never surface errors
        }
      }
    }

    return response;
  };
}

// ── Default export (convenience) ─────────────────────────────────────────────
const RuneSignal = { configure, log, track, proxyUrl, calculateCost, PRICING, VERSION };
export default RuneSignal;
