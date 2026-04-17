import type {
  IntegrationAdapter,
  AdapterConnectionConfig,
  AdapterTestResult,
  HitlApprovalPayload,
  HitlDecisionPayload,
  AdapterDispatchResult,
  ExternalRef,
} from './IntegrationAdapter.interface';

interface TeamsConfig extends AdapterConnectionConfig {
  webhook_url: string;
  bot_app_id?: string;
  bot_app_password?: string;
  tenant_id?: string;
}

export class TeamsAdapter implements IntegrationAdapter {
  readonly provider = 'teams';

  async testConnection(config: AdapterConnectionConfig): Promise<AdapterTestResult> {
    const cfg = config as TeamsConfig;
    const start = Date.now();
    try {
      // Teams incoming webhooks don't have a health endpoint —
      // best we can do is verify the URL is reachable.
      const res = await fetch(cfg.webhook_url, { method: 'HEAD' });
      return {
        success: res.ok || res.status === 405, // 405 = Method Not Allowed is normal for POST-only
        message: res.ok || res.status === 405 ? 'Teams webhook reachable' : `HTTP ${res.status}`,
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
    const cfg = config as TeamsConfig;

    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', size: 'Large', weight: 'Bolder', text: '\u26a0\ufe0f HITL Approval Required' },
            { type: 'TextBlock', text: payload.action_description, wrap: true, weight: 'Bolder' },
            {
              type: 'FactSet',
              facts: [
                { title: 'Priority', value: payload.priority.toUpperCase() },
                { title: 'Agent ID', value: payload.agent_id.slice(0, 12) + '\u2026' },
                { title: 'Blast Radius', value: payload.blast_radius.toUpperCase() },
                { title: 'Expires', value: new Date(payload.expires_at).toLocaleString() },
              ],
            },
          ],
          actions: [
            {
              type: 'Action.Http',
              title: '\u2705 Approve',
              method: 'POST',
              url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/v1/integrations/teams/callback`,
              body: JSON.stringify({ ticket_id: payload.approval_id, action: 'approve' }),
            },
            {
              type: 'Action.Http',
              title: '\u274c Reject',
              method: 'POST',
              url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/v1/integrations/teams/callback`,
              body: JSON.stringify({ ticket_id: payload.approval_id, action: 'reject' }),
            },
          ],
        },
      }],
    };

    try {
      const response = await fetch(cfg.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      return {
        provider: this.provider,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return { provider: this.provider, success: false, error: String(err) };
    }
  }

  async onApprovalDecided(
    config: AdapterConnectionConfig,
    payload: HitlDecisionPayload,
    _externalRef?: ExternalRef
  ): Promise<AdapterDispatchResult> {
    const cfg = config as TeamsConfig;

    // Post a follow-up card with the decision
    const emoji = payload.decision === 'approved' ? '\u2705' : '\u274c';
    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              size: 'Large',
              weight: 'Bolder',
              text: `${emoji} HITL ${payload.decision.toUpperCase()}`,
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Approval ID', value: payload.approval_id },
                { title: 'Decided by', value: payload.decided_by || 'unknown' },
                { title: 'Note', value: payload.reviewer_note || 'none' },
              ],
            },
          ],
        },
      }],
    };

    try {
      const response = await fetch(cfg.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      return {
        provider: this.provider,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return { provider: this.provider, success: false, error: String(err) };
    }
  }
}
