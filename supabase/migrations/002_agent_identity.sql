-- supabase/migrations/002_agent_identity.sql

-- Agent Credentials Table
CREATE TABLE agent_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL, -- 'langgraph' | 'mcp' | 'crewai' | 'custom' | 'finance' | 'orchestrator'
    framework TEXT,
    public_key TEXT, -- RS256 public key for agent-signed requests (optional if using HS256 for MVP)
    status TEXT NOT NULL DEFAULT 'active', -- active | suspended | revoked
    created_by UUID, -- human user who registered this agent
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'revoked'))
);

-- Permission Scopes Table
CREATE TABLE permission_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agent_credentials(id) ON DELETE CASCADE,
    resource TEXT NOT NULL, -- 'database:orders' | 'api:salesforce' | 'tool:*'
    actions TEXT[] NOT NULL, -- ['read', 'write']
    conditions JSONB DEFAULT '{}', -- e.g. {'max_rows': 1000, 'time_window': '09:00-17:00'}
    expires_at TIMESTAMPTZ,
    granted_by UUID, -- human approver
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_scopes ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own agents
CREATE POLICY tenant_agent_isolation ON agent_credentials
    FOR ALL USING (tenant_id = auth.uid());

-- Permission scopes follow agent ownership
CREATE POLICY tenant_scope_isolation ON permission_scopes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agent_credentials 
            WHERE agent_credentials.id = permission_scopes.agent_id 
            AND agent_credentials.tenant_id = auth.uid()
        )
    );

-- Audit rules (S6 metadata changes should be audited)
-- We don't make the credentials table immutable because status/last_seen changes,
-- but all changes are naturally tracked in audit_events via the S6 service.
