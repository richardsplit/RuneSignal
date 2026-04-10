-- ============================================================
-- Migration 035: S10 Sovereign AI Data Residency Engine
-- Per-tenant data residency policies and TrustLayer-curated
-- provider→region mapping for compliance validation.
-- ============================================================

-- Provider regions: TrustLayer-curated catalog of LLM provider data residency
-- Table was first created in 024_sovereignty_validator.sql with a narrower schema.
-- This migration adds the missing columns idempotently.
CREATE TABLE IF NOT EXISTS provider_regions (
  provider        TEXT    NOT NULL,
  model           TEXT    NOT NULL,
  region          TEXT    NOT NULL,
  PRIMARY KEY (provider, model)
);

-- Add columns introduced in this migration (safe to run multiple times)
ALTER TABLE provider_regions ADD COLUMN IF NOT EXISTS id          UUID        DEFAULT gen_random_uuid();
ALTER TABLE provider_regions ADD COLUMN IF NOT EXISTS data_center TEXT        NULL;
ALTER TABLE provider_regions ADD COLUMN IF NOT EXISTS gdpr_adequate  BOOLEAN  NOT NULL DEFAULT false;
ALTER TABLE provider_regions ADD COLUMN IF NOT EXISTS hipaa_eligible BOOLEAN  NOT NULL DEFAULT false;
ALTER TABLE provider_regions ADD COLUMN IF NOT EXISTS pci_eligible   BOOLEAN  NOT NULL DEFAULT false;
ALTER TABLE provider_regions ADD COLUMN IF NOT EXISTS notes          TEXT      NULL;
ALTER TABLE provider_regions ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add (provider, model, region) unique constraint if it doesn't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_regions_provider_model_region_key'
      AND conrelid = 'provider_regions'::regclass
  ) THEN
    ALTER TABLE provider_regions ADD CONSTRAINT provider_regions_provider_model_region_key UNIQUE (provider, model, region);
  END IF;
END $$;

-- No RLS on provider_regions (public catalog — no tenant data)
ALTER TABLE provider_regions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'public_read_provider_regions'
      AND tablename  = 'provider_regions'
  ) THEN
    CREATE POLICY "public_read_provider_regions" ON provider_regions FOR SELECT USING (true);
  END IF;
END $$;

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
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'tenant_manage_residency_policy'
      AND tablename  = 'data_residency_policies'
  ) THEN
    CREATE POLICY "tenant_manage_residency_policy"
      ON data_residency_policies FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
  END IF;
END $$;

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
ON CONFLICT (provider, model, region) DO UPDATE SET
  data_center    = EXCLUDED.data_center,
  gdpr_adequate  = EXCLUDED.gdpr_adequate,
  hipaa_eligible = EXCLUDED.hipaa_eligible,
  pci_eligible   = EXCLUDED.pci_eligible,
  notes          = EXCLUDED.notes,
  updated_at     = now();
