import type {
  IntegrationAdapter,
  AdapterConnectionConfig,
  AdapterTestResult,
  HitlApprovalPayload,
  HitlDecisionPayload,
  AdapterDispatchResult,
  ExternalRef,
} from './IntegrationAdapter.interface';

/**
 * PagerDuty Integration Adapter — v2 stub
 * Full implementation available in Enterprise tier.
 */
export class PagerDutyAdapter implements IntegrationAdapter {
  readonly provider = 'pagerduty';

  async testConnection(_config: AdapterConnectionConfig): Promise<AdapterTestResult> {
    return { success: false, message: 'PagerDuty integration available in Enterprise tier' };
  }

  async onApprovalCreated(
    _config: AdapterConnectionConfig,
    _payload: HitlApprovalPayload
  ): Promise<AdapterDispatchResult> {
    return { provider: this.provider, success: false, error: 'PagerDuty integration available in Enterprise tier' };
  }

  async onApprovalDecided(
    _config: AdapterConnectionConfig,
    _payload: HitlDecisionPayload,
    _externalRef?: ExternalRef
  ): Promise<AdapterDispatchResult> {
    return { provider: this.provider, success: false, error: 'PagerDuty integration available in Enterprise tier' };
  }
}
