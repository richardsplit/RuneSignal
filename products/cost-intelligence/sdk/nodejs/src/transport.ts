/**
 * Fire-and-forget HTTP transport.
 * Never throws. Never awaits. Never blocks the caller.
 */
import type { InferenceLog } from './types.js';

const DEFAULT_BASE_URL = 'https://api.runesignal.com';

export function ship(
  payload: InferenceLog,
  apiKey: string,
  baseUrl = DEFAULT_BASE_URL,
): void {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/ingest/log`;
  const body = JSON.stringify({ ...payload, tenant_api_key: undefined });

  // Use setImmediate / queueMicrotask to ensure we never block the call site
  setImmediate(() => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    }).catch(() => {
      // Silently swallow — SDK must never surface errors to user code
    });
  });
}
