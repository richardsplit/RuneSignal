-- ============================================================
-- Migration 039: S14 Agent Behaviour Anomaly Detector
-- Statistical baseline tracking (Welford's online algorithm)
-- and anomaly event log for detected deviations.
-- ============================================================

-- anomaly_baselines already exists from 022_anomaly.sql.
-- Old schema: agent_id TEXT (not UUID), last_updated nullable.
-- New schema: adds ON DELETE CASCADE, last_updated NOT NULL.
-- Use CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS anomaly_baselines (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id        UUID        NOT NULL,
  metric_name     TEXT        NOT NULL,
  mean            NUMERIC(18,8) NOT NULL DEFAULT 0,
  stddev          NUMERIC(18,8) NOT NULL DEFAULT 0,
  sample_count    INTEGER     NOT NULL DEFAULT 0,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_id, metric_name)
);

-- No new columns needed — schema matches. Ensure NOT NULL defaults on existing rows.
UPDATE anomaly_baselines SET last_updated = now() WHERE last_updated IS NULL;
ALTER TABLE anomaly_baselines ALTER COLUMN last_updated SET NOT NULL;
ALTER TABLE anomaly_baselines ALTER COLUMN last_updated SET DEFAULT now();

-- anomaly_events already exists from 022_anomaly.sql.
-- Old schema: agent_id TEXT, resolved BOOLEAN, no: auto_suspended, hitl_ticket_id, resolved_at, resolved_by, resolution_note.
CREATE TABLE IF NOT EXISTS anomaly_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  agent_id        UUID        NOT NULL,
  anomaly_type    TEXT        NOT NULL,
  z_score         NUMERIC(8,4) NOT NULL,
  baseline_value  NUMERIC(18,8) NOT NULL,
  observed_value  NUMERIC(18,8) NOT NULL,
  severity        TEXT        NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_suspended  BOOLEAN     NOT NULL DEFAULT false,
  hitl_ticket_id  UUID        NULL REFERENCES hitl_exceptions(id),
  resolved_at     TIMESTAMPTZ NULL,
  resolved_by     TEXT        NULL,
  resolution_note TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns missing from 022 version
ALTER TABLE anomaly_events
  ADD COLUMN IF NOT EXISTS auto_suspended  BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hitl_ticket_id  UUID        NULL,
  ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS resolved_by     TEXT        NULL,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT        NULL,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();

-- 022 had 'resolved BOOLEAN' — keep it; resolved_at is the new enriched version.
-- Backfill created_at from existing rows that might have it null
UPDATE anomaly_events SET created_at = now() WHERE created_at IS NULL;

-- Add severity CHECK if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'anomaly_events_severity_check'
      AND conrelid = 'anomaly_events'::regclass
  ) THEN
    ALTER TABLE anomaly_events ADD CONSTRAINT anomaly_events_severity_check
      CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

ALTER TABLE anomaly_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_events    ENABLE ROW LEVEL SECURITY;

-- Drop old policies from 022
DROP POLICY IF EXISTS ae_tenant               ON anomaly_events;
DROP POLICY IF EXISTS ab_tenant               ON anomaly_baselines;
DROP POLICY IF EXISTS tenant_read_baselines   ON anomaly_baselines;
DROP POLICY IF EXISTS service_manage_baselines ON anomaly_baselines;
DROP POLICY IF EXISTS tenant_read_anomalies   ON anomaly_events;
DROP POLICY IF EXISTS service_insert_anomalies ON anomaly_events;
DROP POLICY IF EXISTS tenant_update_anomalies ON anomaly_events;

CREATE POLICY "tenant_read_baselines"
  ON anomaly_baselines FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_baselines"
  ON anomaly_baselines FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "tenant_read_anomalies"
  ON anomaly_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_anomalies"
  ON anomaly_events FOR INSERT WITH CHECK (true);
CREATE POLICY "tenant_update_anomalies"
  ON anomaly_events FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Agent credentials for S6 suspension integration (if not already present)
CREATE TABLE IF NOT EXISTS agent_credentials (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL REFERENCES tenants(id),
  agent_id    UUID    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_id)
);

ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_manage_agent_credentials ON agent_credentials;
CREATE POLICY "tenant_manage_agent_credentials"
  ON agent_credentials FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Indexes — use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_anomaly_events_tenant   ON anomaly_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_agent    ON anomaly_events(agent_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_severity ON anomaly_events(severity) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_anomaly_baselines_tenant ON anomaly_baselines(tenant_id, agent_id);
