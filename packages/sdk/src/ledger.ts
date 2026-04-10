import type { TrustLayerConfig, LedgerSignOptions, LedgerEntry } from './types';

export class LedgerClient {
  constructor(private config: Required<TrustLayerConfig>) {}

  /**
   * Cryptographically sign an agent action into the S3 audit ledger.
   */
  async sign(options: LedgerSignOptions): Promise<LedgerEntry> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/provenance/certify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        agent_id: options.agentId || this.config.agentId,
        event_type: options.type,
        payload: options.payload,
        session_id: options.sessionId,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`[TrustLayer Ledger] Failed to sign: ${(err as any).error || response.status}`);
    }

    const data = await response.json();
    return {
      entryId: data.id || data.certificate_id || data.entry_id,
      type: options.type,
      agentId: options.agentId || this.config.agentId,
      signature: data.signature || data.hash || '',
      timestamp: data.created_at || new Date().toISOString(),
    };
  }
}
