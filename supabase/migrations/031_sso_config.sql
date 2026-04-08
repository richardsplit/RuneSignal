-- ============================================================
-- Migration 031: SSO Configuration
-- Stores per-tenant SSO provider settings (Okta, Entra, Auth0).
-- When enforce_sso = true, password login is disabled for that tenant.
-- ============================================================

CREATE TABLE IF NOT EXISTS sso_configurations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider      TEXT        NOT NULL CHECK (provider IN ('okta', 'entra', 'auth0', 'saml', 'oidc')),
  config        JSONB       NOT NULL DEFAULT '{}',  -- Encrypted: client_id, client_secret, issuer, etc.
  enforce_sso   BOOLEAN     NOT NULL DEFAULT false, -- If true, disables password login
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

-- Row Level Security
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_sso_config"
  ON sso_configurations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_write_sso_config"
  ON sso_configurations
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

CREATE INDEX idx_sso_config_tenant
  ON sso_configurations (tenant_id, is_active);
