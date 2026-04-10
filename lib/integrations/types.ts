/**
 * RuneSignal Integration Types
 * Shared contracts for all external approval channel integrations.
 */

export type IntegrationProvider = 'slack' | 'teams' | 'jira' | 'servicenow' | 'webhook';

export interface IntegrationChannel {
  id: string;
  tenant_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Slack-specific config stored in integration_channels.config */
export interface SlackChannelConfig {
  bot_token: string;        // xoxb-...
  channel_id: string;       // C01234... or #channel-name
  signing_secret: string;   // Used to verify Slack request signatures
  app_id?: string;
}

/** Teams-specific config */
export interface TeamsChannelConfig {
  webhook_url: string;      // Incoming webhook or Graph API + bot token
  bot_app_id?: string;
  bot_app_password?: string;
  tenant_id?: string;       // Azure tenant ID
}

/** Jira-specific config */
export interface JiraChannelConfig {
  base_url: string;         // https://mycompany.atlassian.net
  api_token: string;        // Atlassian API token
  user_email: string;       // Account email for Basic auth
  project_key: string;      // e.g. "TL"
  issue_type?: string;      // e.g. "Task", "Story" — defaults to "Task"
  approval_field?: string;  // Custom field ID for approval status
}

/** ServiceNow-specific config */
export interface ServiceNowChannelConfig {
  instance_url: string;     // https://mycompany.service-now.com
  username: string;
  password: string;
  table?: string;           // Defaults to "incident"
  category?: string;        // ServiceNow category field value
}

/** Generic webhook config */
export interface WebhookChannelConfig {
  url: string;
  secret?: string;          // HMAC signing secret for request verification
  headers?: Record<string, string>;
}

/** External reference stored in hitl_exceptions.external_refs */
export interface ExternalRef {
  slack?: { channel: string; ts: string };
  teams?: { conversation_id: string; activity_id: string };
  jira?: { issue_key: string; issue_id: string };
  servicenow?: { sys_id: string; number: string };
  webhook?: { url: string; delivered_at: string };
}

/** Result from dispatching to an integration */
export interface DispatchResult {
  provider: IntegrationProvider;
  success: boolean;
  external_ref?: Partial<ExternalRef[keyof ExternalRef]>;
  error?: string;
}

/** Common HITL ticket shape used by all dispatchers */
export interface HitlTicketSummary {
  id: string;
  tenant_id: string;
  agent_id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  context_data: Record<string, unknown>;
  sla_deadline: string;
  created_at: string;
}
