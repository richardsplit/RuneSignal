/**
 * RuneSignal Firewall Types
 * Unified action evaluation request/response contracts.
 */

export interface FirewallRequest {
  agent_id: string;
  action: string;           // What the agent is trying to do (e.g. "delete_user_record")
  resource: string;         // Target resource (e.g. "crm:contacts", "s3:prod-bucket")
  tool_name?: string;       // MCP tool name if applicable
  description?: string;     // Human-readable description for HITL/audit
  domain?: string;          // Moral domain hint: 'finance' | 'security' | 'compliance' | 'comms' | 'ip' | 'ops'
  metadata?: Record<string, unknown>; // Extra context passed to conscience & policy engines
  risk_threshold?: number;  // Override default threshold (0-100); default 50
}

export type FirewallVerdict = 'allow' | 'block' | 'escalate';

export interface FirewallCheckResult {
  check: string;       // e.g. 's6_identity', 's1_policy', 's8_moral', 's5_risk'
  passed: boolean;
  detail: string;
  latency_ms: number;
}

export interface FirewallResponse {
  evaluation_id: string;
  verdict: FirewallVerdict;
  risk_score: number;       // 0-100
  checks: FirewallCheckResult[];
  reasons: string[];        // Human-readable reasons for verdict
  certificate_id?: string;  // Audit ledger event ID
  hitl_ticket_id?: string;  // Set when verdict = 'escalate'
  latency_ms: number;
}
