import type {
  IntegrationAdapter,
  AdapterConnectionConfig,
  AdapterTestResult,
  HitlApprovalPayload,
  HitlDecisionPayload,
  AdapterDispatchResult,
  ExternalRef,
} from './IntegrationAdapter.interface';

interface WebhookConfig extends AdapterConnectionConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

export class WebhookAdapter implements IntegrationAdapter {
  readonly provider = 'webhook';

  async testConnection(config: AdapterConnectionConfig): Promise<AdapterTestResult> {
    const cfg = config as WebhookConfig;
    const start = Date.now();
    try {
      const res = await fetch(cfg.url, { method: 'HEAD' });
      return {
        success: res.ok || res.status === 405,
        message: res.ok || res.status === 405 ? 'Webhook endpoint reachable' : `HTTP ${res.status}`,
        latency_ms: Date.now() - start,
      };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  async onApprovalCreated(
    config: AdapterConnectionConfig,
    payload: HitlApprovalPayload
  ): Promise<AdapterDispatchResult> {
    return this._send(config as WebhookConfig, 'hitl.created', payload as unknown as Record<string, unknown>);
  }

  async onApprovalDecided(
    config: AdapterConnectionConfig,
    payload: HitlDecisionPayload,
    _externalRef?: ExternalRef
  ): Promise<AdapterDispatchResult> {
    return this._send(config as WebhookConfig, 'hitl.resolved', payload as unknown as Record<string, unknown>);
  }

  private async _send(
    config: WebhookConfig,
    event: string,
    payload: Record<string, unknown>
  ): Promise<AdapterDispatchResult> {
    const body = JSON.stringify(payload);

    const headersToSend: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RuneSignal-Event': event,
      ...(config.headers || {}),
    };

    if (config.secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(config.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      headersToSend['X-RuneSignal-Signature'] = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: headersToSend,
        body,
      });

      return {
        provider: this.provider,
        success: response.ok,
        external_ref: response.ok
          ? { external_id: config.url, metadata: { url: config.url, delivered_at: new Date().toISOString() } }
          : undefined,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return { provider: this.provider, success: false, error: String(err) };
    }
  }
}
