import type {
  IntegrationAdapter,
  AdapterConnectionConfig,
  AdapterTestResult,
  HitlApprovalPayload,
  HitlDecisionPayload,
  AdapterDispatchResult,
  ExternalRef,
} from './IntegrationAdapter.interface';

interface ServiceNowConfig extends AdapterConnectionConfig {
  instance_url: string;
  username: string;
  password: string;
  table?: string;
  category?: string;
}

export class ServiceNowAdapter implements IntegrationAdapter {
  readonly provider = 'servicenow';

  private authHeader(cfg: ServiceNowConfig): string {
    return `Basic ${Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')}`;
  }

  async testConnection(config: AdapterConnectionConfig): Promise<AdapterTestResult> {
    const cfg = config as ServiceNowConfig;
    const start = Date.now();
    try {
      const res = await fetch(`${cfg.instance_url}/api/now/table/sys_user?sysparm_limit=1`, {
        headers: { Authorization: this.authHeader(cfg), Accept: 'application/json' },
      });
      return {
        success: res.ok,
        message: res.ok ? 'ServiceNow connection successful' : `HTTP ${res.status}`,
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
    const cfg = config as ServiceNowConfig;
    const urgencyMap: Record<string, string> = { critical: '1', high: '2', medium: '3', low: '3' };

    try {
      const res = await fetch(
        `${cfg.instance_url}/api/now/table/${cfg.table || 'incident'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: this.authHeader(cfg),
          },
          body: JSON.stringify({
            short_description: `[RuneSignal HITL] ${payload.action_type}: ${payload.action_description.slice(0, 160)}`,
            description: `Agent: ${payload.agent_id}\nAction: ${payload.action_type}\nBlast Radius: ${payload.blast_radius}\nReversible: ${payload.reversible}\n\n${payload.action_description}`,
            urgency: urgencyMap[payload.blast_radius] || '3',
            category: cfg.category || 'AI Governance',
            caller_id: 'RuneSignal',
            u_runesignal_approval_id: payload.approval_id,
            u_review_url: payload.review_url || '',
          }),
        }
      );

      if (!res.ok) {
        return { provider: this.provider, success: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      return {
        provider: this.provider,
        success: true,
        external_ref: {
          external_id: data.result?.sys_id || '',
          external_url: `${cfg.instance_url}/incident.do?sys_id=${data.result?.sys_id}`,
          metadata: { sys_id: data.result?.sys_id, number: data.result?.number },
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
    const cfg = config as ServiceNowConfig;
    const sysId = (externalRef?.metadata as any)?.sys_id;
    if (!sysId) return { provider: this.provider, success: true };

    try {
      // Update the incident state
      const stateMap = { approved: '6', rejected: '7' }; // 6=Resolved, 7=Closed
      const res = await fetch(
        `${cfg.instance_url}/api/now/table/${cfg.table || 'incident'}/${sysId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: this.authHeader(cfg),
          },
          body: JSON.stringify({
            state: stateMap[payload.decision],
            close_notes: `RuneSignal HITL Decision: ${payload.decision.toUpperCase()}\nReviewer: ${payload.decided_by || 'unknown'}\nNote: ${payload.reviewer_note || ''}`,
            close_code: payload.decision === 'approved' ? 'Approved' : 'Rejected',
          }),
        }
      );

      return { provider: this.provider, success: res.ok };
    } catch (err) {
      return { provider: this.provider, success: false, error: String(err) };
    }
  }
}
