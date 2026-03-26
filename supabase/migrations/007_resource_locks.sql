-- supabase/migrations/007_resource_locks.sql

-- Resource Locks Table
-- Used for exact-match semantic locking of critical infrastructure or high-risk intents.
CREATE TABLE resource_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL REFERENCES agent_credentials(id),
    resource_name TEXT NOT NULL, -- e.g. "restricted_db", "payment_gateway"
    lock_type TEXT NOT NULL DEFAULT 'exclusive', -- exclusive | shared
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_resource_locks_active ON resource_locks (resource_name, tenant_id) WHERE expires_at > NOW();

-- RLS
ALTER TABLE resource_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_lock_isolation ON resource_locks FOR ALL USING (tenant_id = auth.uid());
