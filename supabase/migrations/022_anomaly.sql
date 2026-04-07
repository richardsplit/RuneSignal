-- S14 Anomaly Detector Schema

CREATE TABLE IF NOT EXISTS anomaly_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    agent_id TEXT NOT NULL,
    anomaly_type TEXT NOT NULL, -- 'cost_spike', 'error_rate', 'token_volume', 'velocity'
    z_score NUMERIC NOT NULL,
    baseline_value NUMERIC NOT NULL,
    observed_value NUMERIC NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomaly_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    agent_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    mean NUMERIC NOT NULL DEFAULT 0,
    stddev NUMERIC NOT NULL DEFAULT 0,
    sample_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, agent_id, metric_name)
);

ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ae_tenant ON anomaly_events;
DROP POLICY IF EXISTS ab_tenant ON anomaly_baselines;

CREATE POLICY ae_tenant ON anomaly_events FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY ab_tenant ON anomaly_baselines FOR ALL USING (tenant_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_anomaly_tenant ON anomaly_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_baseline_lookup ON anomaly_baselines(tenant_id, agent_id, metric_name);
