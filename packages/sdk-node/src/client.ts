/**
 * RuneSignal Node SDK — Base HTTP Client
 */

import {
  RuneSignalClientConfig,
  RuneSignalError,
  AuthenticationError,
  RateLimitError,
} from './types';

const DEFAULT_BASE_URL = 'https://app.runesignal.ai';
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_RETRIES = 2;

export class BaseClient {
  protected readonly apiKey: string;
  protected readonly baseUrl: string;
  protected readonly defaultAgentId?: string;
  protected readonly timeout: number;
  protected readonly maxRetries: number;

  constructor(config: RuneSignalClientConfig) {
    if (!config.apiKey) throw new Error('RuneSignal SDK: apiKey is required');
    if (!config.apiKey.startsWith('tl_')) {
      throw new Error('RuneSignal SDK: apiKey must start with "tl_"');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.defaultAgentId = config.agentId;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      body?: unknown;
      agentId?: string;
      query?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const agentId = options.agentId || this.defaultAgentId;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-SDK-Version': '1.0.0',
      'X-SDK-Language': 'node',
      ...(agentId ? { 'X-Agent-Id': agentId } : {}),
    };

    let url = `${this.baseUrl}${path}`;
    if (options.query) {
      const params = new URLSearchParams(options.query);
      url += `?${params.toString()}`;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) throw new AuthenticationError(data.message || data.error);
        if (response.status === 429) throw new RateLimitError(data.message || data.error);

        if (!response.ok && response.status < 500) {
          throw new RuneSignalError(
            data.error || data.message || `Request failed: ${response.status}`,
            response.status,
            data.code
          );
        }

        if (!response.ok && response.status >= 500 && attempt < this.maxRetries) {
          // Retry on server errors
          await sleep(Math.pow(2, attempt) * 500);
          lastError = new RuneSignalError(
            data.error || `Server error: ${response.status}`,
            response.status
          );
          continue;
        }

        return data as T;
      } catch (e) {
        clearTimeout(timer);
        if (e instanceof RuneSignalError) throw e;
        if ((e as any).name === 'AbortError') {
          throw new RuneSignalError('Request timed out', 408, 'TIMEOUT');
        }
        lastError = e as Error;
        if (attempt < this.maxRetries) {
          await sleep(Math.pow(2, attempt) * 500);
        }
      }
    }

    throw lastError || new RuneSignalError('Request failed after retries', 500);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
