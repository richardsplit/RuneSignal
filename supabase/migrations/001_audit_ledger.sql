-- supabase/migrations/001_audit_ledger.sql

-- Enable pgvector extension for S1 (Conflict Arbiter) later
CREATE EXTENSION IF NOT EXISTS vector;

-- Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Events Table (The Sacred Ledger)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,          -- 'provenance.certificate', 'conflict.detected', etc.
    module TEXT NOT NULL,              -- 's3', 's1', 's6', 's7', 's5'
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID,                     -- NULL for human-initiated events
    request_id UUID NOT NULL,
    payload JSONB NOT NULL,            -- event-specific data
    signature TEXT NOT NULL,           -- Ed25519 signature of (id||event_type||payload||ts)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce immutability at DB level
CREATE RULE no_update_audit AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_events DO INSTEAD NOTHING;

-- Indexes for compliance queries and performance
CREATE INDEX idx_audit_tenant_ts ON audit_events (tenant_id, created_at DESC);
CREATE INDEX idx_audit_agent ON audit_events (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_audit_request ON audit_events (request_id);
CREATE INDEX idx_audit_event_type ON audit_events (event_type);

-- Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Tenants can only read their own data
CREATE POLICY tenant_isolation_policy ON tenants
    FOR SELECT USING (id = auth.uid());

-- Audit events can only be read by the tenant they belong to
CREATE POLICY audit_tenant_isolation_policy ON audit_events
    FOR SELECT USING (tenant_id = auth.uid());

-- NOTE: Inserts to audit_events are handled exclusively by the service role API.
-- No client-side inserts allowed to preserve signature integrity.
