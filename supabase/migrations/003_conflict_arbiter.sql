-- supabase/migrations/003_conflict_arbiter.sql

-- Policy Table (Semantic Enforcement)
CREATE TABLE arbiter_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    intent_category TEXT, -- e.g. 'financial_transfer', 'permission_update'
    policy_action TEXT NOT NULL DEFAULT 'block', -- block | queue | alert
    embedding vector(1536), -- Vector for semantic policy matching
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Intent Registry (Ephemeral-ish intent tracking)
CREATE TABLE agent_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL REFERENCES agent_credentials(id),
    intent_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | allowed | blocked | completed
    embedding vector(1536), -- Vector for semantic conflict detection
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL, -- Short TTL manual simulation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE arbiter_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_policy_isolation ON arbiter_policies
    FOR ALL USING (tenant_id = auth.uid());

CREATE POLICY tenant_intent_isolation ON agent_intents
    FOR ALL USING (tenant_id = auth.uid());

-- Indexes for vector similarity search
CREATE INDEX idx_policy_embedding ON arbiter_policies USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_intent_embedding ON agent_intents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_intent_expiry ON agent_intents (expires_at);
