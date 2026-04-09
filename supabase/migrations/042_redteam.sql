-- ============================================================
-- Migration 042: S17 Automated Agent Red Teaming
-- Campaign tracking and per-attack results.
-- OWASP Agentic AI Top 10 (2026) reference mapping.
-- ============================================================

-- Red team campaigns
CREATE TABLE IF NOT EXISTS red_team_campaigns (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_agent_id     UUID        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_attacks       INTEGER     NOT NULL DEFAULT 0,
  successful_defenses INTEGER     NOT NULL DEFAULT 0,
  resilience_score    NUMERIC(6,2) NOT NULL DEFAULT 0,  -- 0–100
  campaign_type       TEXT        NOT NULL DEFAULT 'full',
  started_at          TIMESTAMPTZ NULL,
  completed_at        TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE red_team_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_manage_campaigns"
  ON red_team_campaigns FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_campaigns"
  ON red_team_campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_campaigns"
  ON red_team_campaigns FOR UPDATE USING (true);

-- Per-attack results
CREATE TABLE IF NOT EXISTS red_team_attacks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES red_team_campaigns(id) ON DELETE CASCADE,
  attack_vector   TEXT        NOT NULL,   -- 'jailbreak', 'injection', 'extraction', 'roleplay_bypass'
  severity        TEXT        NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  prompt_used     TEXT        NOT NULL,
  agent_response  TEXT        NULL,
  was_defended    BOOLEAN     NOT NULL DEFAULT false,
  -- OWASP Agentic Top 10 mapping
  owasp_category  TEXT        NULL,  -- 'ASI01', 'ASI02', ..., 'ASI10'
  remediation     TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE red_team_attacks ENABLE ROW LEVEL SECURITY;
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

CREATE INDEX idx_campaigns_tenant ON red_team_campaigns(tenant_id, created_at DESC);
CREATE INDEX idx_campaigns_agent ON red_team_campaigns(target_agent_id);
CREATE INDEX idx_attacks_campaign ON red_team_attacks(campaign_id);
CREATE INDEX idx_attacks_severity ON red_team_attacks(severity) WHERE was_defended = false;
