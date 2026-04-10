-- ============================================================
-- Migration 042: S17 Automated Agent Red Teaming
-- Campaign tracking and per-attack results.
-- OWASP Agentic AI Top 10 (2026) reference mapping.
-- ============================================================

-- red_team_campaigns already exists from 021_red_team.sql.
-- Old schema: target_agent_id TEXT, status default 'running' (not 'queued'),
--   no campaign_type, no started_at.
-- New schema: target_agent_id UUID, status default 'queued', adds campaign_type/started_at.
CREATE TABLE IF NOT EXISTS red_team_campaigns (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_agent_id     UUID        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_attacks       INTEGER     NOT NULL DEFAULT 0,
  successful_defenses INTEGER     NOT NULL DEFAULT 0,
  resilience_score    NUMERIC(6,2) NOT NULL DEFAULT 0,
  campaign_type       TEXT        NOT NULL DEFAULT 'full',
  started_at          TIMESTAMPTZ NULL,
  completed_at        TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns missing from 021 version
ALTER TABLE red_team_campaigns
  ADD COLUMN IF NOT EXISTS campaign_type TEXT        NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS started_at   TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure NOT NULL + default for numeric columns from 021 that may be nullable
UPDATE red_team_campaigns SET total_attacks = 0       WHERE total_attacks IS NULL;
UPDATE red_team_campaigns SET successful_defenses = 0 WHERE successful_defenses IS NULL;
UPDATE red_team_campaigns SET resilience_score = 0    WHERE resilience_score IS NULL;
ALTER TABLE red_team_campaigns
  ALTER COLUMN total_attacks       SET NOT NULL,
  ALTER COLUMN successful_defenses SET NOT NULL,
  ALTER COLUMN resilience_score    SET NOT NULL;

-- Add status CHECK if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'red_team_campaigns_status_check'
      AND conrelid = 'red_team_campaigns'::regclass
  ) THEN
    ALTER TABLE red_team_campaigns ADD CONSTRAINT red_team_campaigns_status_check
      CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

ALTER TABLE red_team_campaigns ENABLE ROW LEVEL SECURITY;

-- Drop old policies from 021
DROP POLICY IF EXISTS rtc_tenant                ON red_team_campaigns;
DROP POLICY IF EXISTS tenant_manage_campaigns   ON red_team_campaigns;
DROP POLICY IF EXISTS service_insert_campaigns  ON red_team_campaigns;
DROP POLICY IF EXISTS service_update_campaigns  ON red_team_campaigns;

CREATE POLICY "tenant_manage_campaigns"
  ON red_team_campaigns FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_campaigns"
  ON red_team_campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_campaigns"
  ON red_team_campaigns FOR UPDATE USING (true);

-- red_team_attacks already exists from 021_red_team.sql.
-- Old schema: executed_at (not created_at), no owasp_category, no remediation.
CREATE TABLE IF NOT EXISTS red_team_attacks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES red_team_campaigns(id) ON DELETE CASCADE,
  attack_vector   TEXT        NOT NULL,
  severity        TEXT        NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  prompt_used     TEXT        NOT NULL,
  agent_response  TEXT        NULL,
  was_defended    BOOLEAN     NOT NULL DEFAULT false,
  owasp_category  TEXT        NULL,
  remediation     TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns missing from 021 version
ALTER TABLE red_team_attacks
  ADD COLUMN IF NOT EXISTS owasp_category TEXT        NULL,
  ADD COLUMN IF NOT EXISTS remediation    TEXT        NULL,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add severity CHECK if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'red_team_attacks_severity_check'
      AND conrelid = 'red_team_attacks'::regclass
  ) THEN
    ALTER TABLE red_team_attacks ADD CONSTRAINT red_team_attacks_severity_check
      CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

ALTER TABLE red_team_attacks ENABLE ROW LEVEL SECURITY;

-- Drop old policies from 021
DROP POLICY IF EXISTS rta_tenant            ON red_team_attacks;
DROP POLICY IF EXISTS tenant_read_attacks   ON red_team_attacks;
DROP POLICY IF EXISTS service_insert_attacks ON red_team_attacks;

CREATE POLICY "tenant_read_attacks"
  ON red_team_attacks FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM red_team_campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "service_insert_attacks"
  ON red_team_attacks FOR INSERT WITH CHECK (true);

-- Indexes — use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant   ON red_team_campaigns(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_agent    ON red_team_campaigns(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_attacks_campaign   ON red_team_attacks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_attacks_severity   ON red_team_attacks(severity) WHERE was_defended = false;
