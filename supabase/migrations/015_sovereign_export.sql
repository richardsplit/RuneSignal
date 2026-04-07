CREATE TABLE IF NOT EXISTS sovereign_sync_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) UNIQUE,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('s3', 'snowflake')),
  destination_uri TEXT NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  sync_frequency TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sovereign_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  records_synced INTEGER DEFAULT 0,
  bytes_synced BIGINT DEFAULT 0,
  error_details TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE sovereign_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovereign_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_config_tenant ON sovereign_sync_configs;
DROP POLICY IF EXISTS sync_log_tenant ON sovereign_sync_logs;

CREATE POLICY sync_config_tenant ON sovereign_sync_configs FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY sync_log_tenant ON sovereign_sync_logs FOR SELECT USING (tenant_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant ON sovereign_sync_logs(tenant_id, started_at DESC);
