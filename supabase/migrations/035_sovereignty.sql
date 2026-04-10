-- ============================================================
-- Migration 035: S10 Sovereign AI Data Residency Engine
-- Per-tenant data residency policies and TrustLayer-curated
-- provider→region mapping for compliance validation.
-- ============================================================

-- Provider regions: TrustLayer-curated catalog of LLM provider data residency
CREATE TABLE IF NOT EXISTS provider_regions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT    NOT NULL,  -- 'openai', 'anthropic', 'azure', 'mistral', 'google'
  model           TEXT    NOT NULL,  -- 'gpt-4o', 'claude-sonnet-4-6', etc.
  region          TEXT    NOT NULL,  -- 'us', 'eu', 'uk', 'ap', 'global'
  data_center     TEXT    NULL,      -- e.g. 'us-east-1', 'eu-west-1'
  gdpr_adequate   BOOLEAN NOT NULL DEFAULT false,
  hipaa_eligible  BOOLEAN NOT NULL DEFAULT false,
  pci_eligible    BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT    NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, model, region)
);

-- No RLS on provider_regions (public catalog — no tenant data)
ALTER TABLE provider_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_provider_regions" ON provider_regions FOR SELECT USING (true);

-- Per-tenant data residency policies
CREATE TABLE IF NOT EXISTS data_residency_policies (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  allowed_regions       TEXT[]  NOT NULL DEFAULT '{}',   -- e.g. ['eu', 'uk']
  blocked_providers     TEXT[]  NOT NULL DEFAULT '{}',   -- e.g. ['openai'] for EU-only tenants
  data_classifications  TEXT[]  NOT NULL DEFAULT '{}',   -- which classifications this policy applies to: 'pii', 'phi', 'pci', 'confidential'
  auto_reroute          BOOLEAN NOT NULL DEFAULT false,  -- true = silently reroute to compliant provider
  block_on_violation    BOOLEAN NOT NULL DEFAULT true,   -- true = hard block, false = warn only
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE data_residency_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_manage_residency_policy"
  ON data_residency_policies FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- ─── Seed: Provider region catalog ───────────────────────────────────────────
INSERT INTO provider_regions (provider, model, region, data_center, gdpr_adequate, hipaa_eligible, pci_eligible, notes) VALUES
  ('openai',    'gpt-4o',              'us',     'us-east-1',  false, true,  false, 'US data centers. BAA available for HIPAA.'),
  ('openai',    'gpt-4o',              'eu',     'eu-west-1',  true,  false, false, 'Azure OpenAI EU region via Microsoft.'),
  ('openai',    'gpt-4o-mini',         'us',     'us-east-1',  false, true,  false, 'US data centers.'),
  ('anthropic', 'claude-sonnet-4-6',   'us',     'us-east-1',  false, false, false, 'US only. No EU endpoint available Q2 2026.'),
  ('anthropic', 'claude-opus-4-6',     'us',     'us-east-1',  false, false, false, 'US only.'),
  ('anthropic', 'claude-haiku-4-5',    'us',     'us-east-1',  false, false, false, 'US only.'),
  ('azure',     'gpt-4o',              'eu',     'eu-west-1',  true,  true,  true,  'Azure OpenAI EU: GDPR adequate, HIPAA BAA, PCI-DSS.'),
  ('azure',     'gpt-4o',              'us',     'us-east-1',  false, true,  true,  'Azure OpenAI US.'),
  ('mistral',   'mistral-large',       'eu',     'eu-west-3',  true,  false, false, 'Mistral AI: EU-based, GDPR compliant.'),
  ('mistral',   'mistral-medium',      'eu',     'eu-west-3',  true,  false, false, 'Mistral AI: EU-based.'),
  ('google',    'gemini-1.5-pro',      'us',     'us-central1',false, true,  false, 'Google Cloud US. BAA available.'),
  ('google',    'gemini-1.5-pro',      'eu',     'eu-west4',   true,  false, false, 'Google Cloud EU.')
ON CONFLICT (provider, model, region) DO NOTHING;
