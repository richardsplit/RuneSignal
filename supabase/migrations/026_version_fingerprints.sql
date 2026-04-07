-- Model version fingerprint baselines for VersionMonitor
CREATE TABLE IF NOT EXISTS model_version_fingerprints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  fingerprint     TEXT NOT NULL,
  sample_count    INTEGER NOT NULL DEFAULT 1,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, provider, model)
);

ALTER TABLE model_version_fingerprints ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mvf_tenant') THEN
        CREATE POLICY mvf_tenant ON model_version_fingerprints
          FOR ALL USING (tenant_id = auth.uid());
    END IF;
END $$;
