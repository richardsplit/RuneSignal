import type {
  IntegrationAdapter,
  AdapterConnectionConfig,
  AdapterTestResult,
  HitlApprovalPayload,
  HitlDecisionPayload,
  AdapterDispatchResult,
  ExternalRef,
} from './IntegrationAdapter.interface';

interface JiraConfig extends AdapterConnectionConfig {
  base_url: string;
  api_token: string;
  user_email: string;
  project_key: string;
  issue_type?: string;
}

export class JiraAdapter implements IntegrationAdapter {
  readonly provider = 'jira';

  private authHeader(cfg: JiraConfig): string {
    return `Basic ${Buffer.from(`${cfg.user_email}:${cfg.api_token}`).toString('base64')}`;
  }

  async testConnection(config: AdapterConnectionConfig): Promise<AdapterTestResult> {
    const cfg = config as JiraConfig;
    const start = Date.now();
    try {
      const res = await fetch(`${cfg.base_url}/rest/api/3/myself`, {
        headers: { Authorization: this.authHeader(cfg), Accept: 'application/json' },
      });
      const data = await res.json();
      return {
        success: res.ok,
        message: res.ok ? `Connected as ${data.displayName}` : `HTTP ${res.status}`,
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
    const cfg = config as JiraConfig;
    const priorityMap: Record<string, string> = {
      critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low',
    };

    try {
      const res = await fetch(`${cfg.base_url}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader(cfg),
        },
        body: JSON.stringify({
          fields: {
            project: { key: cfg.project_key },
            summary: `[RuneSignal HITL] ${payload.action_type}: ${payload.action_description.slice(0, 200)}`,
            description: {
              type: 'doc', version: 1,
              content: [{
                type: 'paragraph',
                content: [{
                  type: 'text',
                  text: `Agent: ${payload.agent_id}\nBlast Radius: ${payload.blast_radius}\nReversible: ${payload.reversible}\n\n${payload.action_description}${payload.review_url ? `\n\nReview URL: ${payload.review_url}` : ''}`,
                }],
              }],
            },
            issuetype: { name: cfg.issue_type || 'Task' },
            priority: { name: priorityMap[payload.blast_radius] || 'Medium' },
            labels: ['ai-governance', 'hitl-review', payload.blast_radius],
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        return { provider: this.provider, success: false, error: JSON.stringify(err) };
      }

      const data = await res.json();
      return {
        provider: this.provider,
        success: true,
        external_ref: {
          external_id: data.key,
          external_url: `${cfg.base_url}/browse/${data.key}`,
          metadata: { issue_key: data.key, issue_id: data.id },
        },
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
    const cfg = config as JiraConfig;
    const issueId = (externalRef?.metadata as any)?.issue_id;
    if (!issueId) return { provider: this.provider, success: true };

    try {
      await fetch(`${cfg.base_url}/rest/api/3/issue/${issueId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader(cfg),
        },
        body: JSON.stringify({
          body: {
            type: 'doc', version: 1,
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: `RuneSignal HITL Decision: ${payload.decision.toUpperCase()}\nDecided by: ${payload.decided_by || 'unknown'}\nNote: ${payload.reviewer_note || 'none'}\nTimestamp: ${payload.decided_at}`,
              }],
            }],
          },
        }),
      });
      return { provider: this.provider, success: true };
    } catch (err) {
      return { provider: this.provider, success: false, error: String(err) };
    }
  }
}
