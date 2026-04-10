import type {
  IntegrationAdapter,
  AdapterConnectionConfig,
  AdapterTestResult,
  HitlApprovalPayload,
  HitlDecisionPayload,
  AdapterDispatchResult,
  ExternalRef,
} from './IntegrationAdapter.interface';

interface SlackConfig extends AdapterConnectionConfig {
  bot_token: string;
  channel_id: string;
}

export class SlackAdapter implements IntegrationAdapter {
  readonly provider = 'slack';

  async testConnection(config: AdapterConnectionConfig): Promise<AdapterTestResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(config as SlackConfig).bot_token}`,
        },
      });
      const data = await res.json();
      return {
        success: data.ok,
        message: data.ok ? `Connected as ${data.user}` : data.error,
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
    const cfg = config as SlackConfig;
    const priorityEmoji: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

    try {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.bot_token}`,
        },
        body: JSON.stringify({
          channel: cfg.channel_id,
          text: `HITL Approval Required: ${payload.action_description}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${priorityEmoji[payload.blast_radius] || '⚠️'} *HITL Approval Required*\n*${payload.action_description}*`,
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Action:*\n${payload.action_type}` },
                { type: 'mrkdwn', text: `*Blast Radius:*\n${payload.blast_radius.toUpperCase()}` },
                { type: 'mrkdwn', text: `*Reversible:*\n${payload.reversible ? 'Yes' : 'No'}` },
                { type: 'mrkdwn', text: `*Agent:*\n${payload.agent_id.slice(0, 16)}` },
              ],
            },
            ...(payload.review_url ? [{
              type: 'actions',
              elements: [{
                type: 'button',
                text: { type: 'plain_text', text: 'Review in TrustLayer' },
                url: payload.review_url,
                style: 'primary',
              }],
            }] : []),
          ],
        }),
      });

      const data = await res.json();
      if (!data.ok) return { provider: this.provider, success: false, error: data.error };

      return {
        provider: this.provider,
        success: true,
        external_ref: { external_id: data.ts, metadata: { channel: data.channel, ts: data.ts } },
      };
    } catch (err) {
      return { provider: this.provider, success: false, error: String(err) };
    }
  }

  async onApprovalDecided(
    config: AdapterConnectionConfig,
    payload: HitlDecisionPayload,
    externalRef?: ExternalRef
  ): Promise<AdapterDispatchResult> {
    const cfg = config as SlackConfig;
    if (!externalRef?.metadata) return { provider: this.provider, success: true };

    const { channel, ts } = externalRef.metadata as { channel: string; ts: string };
    if (!ts) return { provider: this.provider, success: true };

    const emoji = payload.decision === 'approved' ? '✅' : '❌';
    try {
      await fetch('https://slack.com/api/chat.update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.bot_token}`,
        },
        body: JSON.stringify({
          channel,
          ts,
          text: `${emoji} HITL ${payload.decision.toUpperCase()}: ${payload.approval_id}`,
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emoji} *HITL ${payload.decision.toUpperCase()}*\nApproval ID: ${payload.approval_id}\nDecided by: ${payload.decided_by || 'unknown'}`,
            },
          }],
        }),
      });
      return { provider: this.provider, success: true };
    } catch (err) {
      return { provider: this.provider, success: false, error: String(err) };
    }
  }
}
