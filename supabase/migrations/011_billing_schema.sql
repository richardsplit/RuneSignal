-- supabase/migrations/011_billing_schema.sql
-- Add billing columns to tenants table

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ;

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_tier ON tenants (plan_tier);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{read}', -- 'read', 'write', 'admin'
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys (tenant_id);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own API keys
CREATE POLICY api_keys_tenant_isolation ON api_keys
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
