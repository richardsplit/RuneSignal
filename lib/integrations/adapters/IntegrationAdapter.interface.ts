/**
 * TrustLayer Integration Adapter Interface
 *
 * Unified contract for all external integration providers.
 * Allows adding new providers without touching existing code.
 */

export interface HitlApprovalPayload {
  approval_id: string;
  agent_id: string;
  action_type: string;
  action_description: string;
  blast_radius: string;
  reversible: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  expires_at: string;
  review_url?: string;
}

export interface HitlDecisionPayload {
  approval_id: string;
  decision: 'approved' | 'rejected';
  decided_by?: string;
  reviewer_note?: string;
  decided_at: string;
}

export interface AdapterConnectionConfig {
  [key: string]: unknown;
}

export interface AdapterTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

export interface ExternalRef {
  external_id: string;
  external_url?: string;
  metadata?: Record<string, unknown>;
}

export interface AdapterDispatchResult {
  provider: string;
  success: boolean;
  external_ref?: ExternalRef;
  error?: string;
}

/**
 * Base interface every integration adapter must implement.
 */
export interface IntegrationAdapter {
  readonly provider: string;

  /**
   * Validate the provided config and test connectivity.
   */
  testConnection(config: AdapterConnectionConfig): Promise<AdapterTestResult>;

  /**
   * Send a new HITL approval request to the integration.
   */
  onApprovalCreated(
    config: AdapterConnectionConfig,
    payload: HitlApprovalPayload
  ): Promise<AdapterDispatchResult>;

  /**
   * Notify the integration of a decision (approve/reject).
   * @param externalRef The reference returned by onApprovalCreated
   */
  onApprovalDecided(
    config: AdapterConnectionConfig,
    payload: HitlDecisionPayload,
    externalRef?: ExternalRef
  ): Promise<AdapterDispatchResult>;
}
