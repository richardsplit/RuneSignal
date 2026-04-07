-- S10 Data Residency Validator
-- Curated provider region registry (TrustLayer maintains and updates quarterly)
CREATE TABLE IF NOT EXISTS provider_regions (
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  region           TEXT NOT NULL,    -- 'US' | 'EU' | 'UK' | 'APAC'
  country          TEXT NOT NULL,    -- ISO 2-char country code
  gdpr_compliant   BOOLEAN NOT NULL DEFAULT false,
  hipaa_eligible   BOOLEAN NOT NULL DEFAULT false,
  iso27001         BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (provider, model)
);

-- Tenant residency policies
CREATE TABLE IF NOT EXISTS data_residency_policies (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  policy_name        TEXT NOT NULL DEFAULT 'Default Policy',
  allowed_regions    TEXT[] NOT NULL DEFAULT '{"US","EU","UK","APAC"}',
  blocked_countries  TEXT[] DEFAULT '{}',
  data_classifications TEXT[] NOT NULL DEFAULT '{"PUBLIC","INTERNAL","CONFIDENTIAL","PHI","PII"}',
  block_on_violation BOOLEAN NOT NULL DEFAULT false,  -- false = warn, true = hard block
  auto_reroute       BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed known provider regions
INSERT INTO provider_regions (provider, model, region, country, gdpr_compliant, hipaa_eligible, iso27001) VALUES
  ('openai',              'gpt-4o',              'US', 'US', false, false, false),
  ('openai',              'gpt-4o-mini',          'US', 'US', false, false, false),
  ('anthropic',           'claude-sonnet-4-6',    'US', 'US', false, false, false),
  ('anthropic',           'claude-opus-4-6',      'US', 'US', false, false, false),
  ('anthropic',           'claude-haiku-4-5',     'US', 'US', false, false, false),
  ('azure-openai',        'gpt-4o-eu',            'EU', 'IE', true,  false, true ),
  ('azure-openai',        'gpt-4o-hipaa',         'US', 'US', false, true,  true ),
  ('anthropic-bedrock-eu','claude-sonnet-4-6',    'EU', 'DE', true,  false, false),
  ('mistral',             'mistral-large',        'EU', 'FR', true,  false, true )
ON CONFLICT (provider, model) DO NOTHING;

ALTER TABLE data_residency_policies ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'drp_tenant') THEN
        CREATE POLICY drp_tenant ON data_residency_policies FOR ALL USING (tenant_id = auth.uid());
    END IF;
END $$;

-- provider_regions is public read (no tenant data)
ALTER TABLE provider_regions ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pr_public_read') THEN
        CREATE POLICY pr_public_read ON provider_regions FOR SELECT USING (true);
    END IF;
END $$;
