-- ============================================================
-- Migration 039: S14 Agent Behaviour Anomaly Detector
-- Statistical baseline tracking (Welford's online algorithm)
-- and anomaly event log for detected deviations.
-- ============================================================

-- Per-agent per-metric running statistics (Welford's online algorithm)
CREATE TABLE IF NOT EXISTS anomaly_baselines (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id        UUID        NOT NULL,
  metric_name     TEXT        NOT NULL,  -- 'cost_spike', 'token_volume', 'error_rate', 'velocity'
  mean            NUMERIC(18,8) NOT NULL DEFAULT 0,
  stddev          NUMERIC(18,8) NOT NULL DEFAULT 0,
  sample_count    INTEGER     NOT NULL DEFAULT 0,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_id, metric_name)
);

ALTER TABLE anomaly_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_baselines"
  ON anomaly_baselines FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_baselines"
  ON anomaly_baselines FOR ALL USING (true) WITH CHECK (true);

-- Detected anomaly events
CREATE TABLE IF NOT EXISTS anomaly_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  agent_id        UUID        NOT NULL,
  anomaly_type    TEXT        NOT NULL,   -- matches metric_name
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

ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "tenant_manage_agent_credentials"
  ON agent_credentials FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE INDEX idx_anomaly_events_tenant ON anomaly_events(tenant_id, created_at DESC);
CREATE INDEX idx_anomaly_events_agent ON anomaly_events(agent_id, tenant_id);
CREATE INDEX idx_anomaly_events_severity ON anomaly_events(severity) WHERE resolved_at IS NULL;
CREATE INDEX idx_anomaly_baselines_tenant ON anomaly_baselines(tenant_id, agent_id);
