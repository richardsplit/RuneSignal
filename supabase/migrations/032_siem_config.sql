-- ============================================================
-- Migration 032: SIEM Endpoint Configuration
-- Stores per-tenant SIEM export endpoints for real-time event forwarding.
-- Supports push (webhook) and pull (polling) patterns.
-- ============================================================

CREATE TABLE IF NOT EXISTS siem_endpoints (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL DEFAULT 'Default SIEM',
  endpoint_url  TEXT        NOT NULL,
  format        TEXT        NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'cef')),
  auth_header   TEXT        NULL,      -- e.g. "Authorization: Bearer <token>"
  event_filter  TEXT[]      NULL,      -- Null = all events; or ['firewall.evaluation', 'hitl.*']
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  last_push_at  TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE siem_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_siem_endpoints"
  ON siem_endpoints
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_write_siem_endpoints"
  ON siem_endpoints
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

CREATE INDEX idx_siem_endpoints_tenant
  ON siem_endpoints (tenant_id, is_active);
