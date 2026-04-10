/**
 * RuneSignal Plugin Executor
 *
 * Called non-blocking from AuditLedgerService.appendEvent() after every ledger write.
 * Finds active plugins whose trigger list matches the event type, then fires them
 * with up to 3 retry attempts and exponential back-off.
 *
 * Never throws — all errors are caught and logged to plugin_executions.
 */

import { createAdminClient } from '../db/supabase';

// In-process cache: tracks tenants known to have zero active plugins.
// TTL of 60 seconds — avoids a DB round-trip on every ledger write for
// tenants that haven't installed any plugins yet.
const noPluginsCache = new Map<string, number>(); // tenantId → expiry timestamp
const NO_PLUGINS_TTL_MS = 60_000;

interface AuditEventPayload {
  id: string;
  event_type: string;
  tenant_id: string;
  agent_id?: string | null;
  payload: Record<string, any>;
  created_at: string;
}

interface PluginFireResult {
  plugin_id: string;
  status: 'success' | 'error' | 'timeout';
  status_code?: number;
  latency_ms: number;
  error_message?: string;
}

export class PluginExecutor {
  /**
   * Main entry point. Called fire-and-forget from the ledger service.
   * Resolves all matching plugins and fires them concurrently.
   */
  static async dispatch(event: AuditEventPayload): Promise<void> {
    // Short-circuit: skip DB query entirely if this tenant is cached as having no plugins
    const cacheExpiry = noPluginsCache.get(event.tenant_id);
    if (cacheExpiry && Date.now() < cacheExpiry) return;

    const supabase = createAdminClient();

    // Find all active plugins for this tenant whose triggers match the event type
    const { data: plugins } = await supabase
      .from('plugins')
      .select('*')
      .eq('tenant_id', event.tenant_id)
      .eq('is_active', true);

    if (!plugins || plugins.length === 0) {
      // Cache the zero-plugins state so subsequent events skip this query
      noPluginsCache.set(event.tenant_id, Date.now() + NO_PLUGINS_TTL_MS);
      return;
    }

    // Tenant has plugins — ensure it's not incorrectly cached as having none
    noPluginsCache.delete(event.tenant_id);

    const matchingPlugins = plugins.filter(p => {
      if (!p.triggers || p.triggers.length === 0) return false;
      return p.triggers.some((trigger: string) => {
        if (trigger === '*') return true;
        if (trigger.endsWith('*')) return event.event_type.startsWith(trigger.slice(0, -1));
        return trigger === event.event_type;
      });
    });

    if (matchingPlugins.length === 0) return;

    // Fire all matching plugins concurrently, collect results
    const results = await Promise.allSettled(
      matchingPlugins.map(plugin => this.firePlugin(plugin, event))
    );

    // Log all results
    await Promise.allSettled(
      results.map(async (result, i) => {
        const plugin = matchingPlugins[i];
        const exec = result.status === 'fulfilled' ? result.value : {
          plugin_id: plugin.id,
          status: 'error' as const,
          latency_ms: 0,
          error_message: result.reason?.message || 'Unknown error',
        };

        await supabase.from('plugin_executions').insert({
          plugin_id: plugin.id,
          tenant_id: event.tenant_id,
          event_type: event.event_type,
          audit_event_id: event.id,
          status: exec.status,
          status_code: exec.status_code ?? null,
          error_message: exec.error_message ?? null,
          latency_ms: exec.latency_ms,
        });

        // Update plugin stats
        const updateData: Record<string, any> = {
          last_fired_at: new Date().toISOString(),
          total_fires: plugin.total_fires + 1,
          updated_at: new Date().toISOString(),
        };
        if (exec.status === 'error' || exec.status === 'timeout') {
          updateData.total_errors = plugin.total_errors + 1;
        }
        await supabase.from('plugins').update(updateData).eq('id', plugin.id);
      })
    );
  }

  /**
   * Fire a single plugin with retry logic (up to 3 attempts, exponential back-off).
   */
  private static async firePlugin(
    plugin: any,
    event: AuditEventPayload,
    attempt = 1
  ): Promise<PluginFireResult> {
    const start = Date.now();
    const maxAttempts = plugin.retry_count ?? 3;
    const timeoutMs = plugin.timeout_ms ?? 5000;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RuneSignal-Event': event.event_type,
      'X-RuneSignal-Tenant': event.tenant_id,
      'X-RuneSignal-Delivery': event.id,
    };

    if (plugin.auth_header) {
      const [key, ...rest] = (plugin.auth_header as string).split(':');
      headers[key.trim()] = rest.join(':').trim();
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(plugin.endpoint_url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_id: event.id,
          event_type: event.event_type,
          tenant_id: event.tenant_id,
          agent_id: event.agent_id,
          payload: event.payload,
          created_at: event.created_at,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { plugin_id: plugin.id, status: 'success', status_code: response.status, latency_ms: latencyMs };
      }

      // Non-2xx — retry if attempts remain
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 2 ** attempt * 500)); // 1s, 2s, 4s
        return this.firePlugin(plugin, event, attempt + 1);
      }

      return {
        plugin_id: plugin.id,
        status: 'error',
        status_code: response.status,
        latency_ms: latencyMs,
        error_message: `HTTP ${response.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const isTimeout = err?.name === 'AbortError';

      if (!isTimeout && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 2 ** attempt * 500));
        return this.firePlugin(plugin, event, attempt + 1);
      }

      return {
        plugin_id: plugin.id,
        status: isTimeout ? 'timeout' : 'error',
        latency_ms: latencyMs,
        error_message: isTimeout ? `Timed out after ${timeoutMs}ms` : err.message,
      };
    }
  }
}
