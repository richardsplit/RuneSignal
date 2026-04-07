-- supabase/migrations/012_webhook_settings.sql
-- Module for tenant-configurable governance alerts

CREATE TABLE IF NOT EXISTS webhook_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    slack_url TEXT,
    custom_url TEXT,
    alert_events TEXT[] DEFAULT '{"anomaly", "violation", "escalation"}',
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE webhook_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_settings_tenant_isolation ON webhook_settings;
CREATE POLICY webhook_settings_tenant_isolation ON webhook_settings
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_webhook_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_webhook_settings_updated ON webhook_settings;
CREATE TRIGGER tr_webhook_settings_updated
BEFORE UPDATE ON webhook_settings
FOR EACH ROW EXECUTE FUNCTION update_webhook_settings_timestamp();
