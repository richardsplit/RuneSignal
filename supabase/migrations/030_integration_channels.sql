-- ============================================================
-- Migration 030: Integration Channels
-- Stores per-tenant configuration for external approval channels:
-- Slack, Microsoft Teams, Jira, ServiceNow, generic webhook.
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_channels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider    TEXT        NOT NULL CHECK (provider IN ('slack', 'teams', 'jira', 'servicenow', 'webhook')),
  config      JSONB       NOT NULL DEFAULT '{}',  -- Encrypted provider-specific config (tokens, URLs, etc.)
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

-- Row Level Security
ALTER TABLE integration_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_integration_channels"
  ON integration_channels
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_write_integration_channels"
  ON integration_channels
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Service role insert (used by OAuth callback handlers)
CREATE POLICY "service_manage_integration_channels"
  ON integration_channels
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_integration_channels_tenant
  ON integration_channels (tenant_id, is_active);

-- ─── Extend hitl_exceptions with external_refs ─────────────────────────────
-- Stores references to external tickets/messages created for each HITL ticket.
-- Example: { "slack": {"channel": "C01...", "ts": "173..."}, "jira": {"issue_key": "TL-42"} }

ALTER TABLE hitl_exceptions
  ADD COLUMN IF NOT EXISTS external_refs JSONB NOT NULL DEFAULT '{}';
