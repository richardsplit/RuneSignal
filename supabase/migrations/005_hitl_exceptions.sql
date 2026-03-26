-- supabase/migrations/005_hitl_exceptions.sql

-- Exception Tickets Table (HITL Routing)
CREATE TABLE hitl_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL REFERENCES agent_credentials(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | critical
    status TEXT NOT NULL DEFAULT 'open', -- open | approved | rejected | escalated
    context_data JSONB DEFAULT '{}', -- execution context for human review
    assigned_to UUID, -- user id of human reviewer
    resolved_by UUID, -- user id of human who made decision
    resolution_reason TEXT,
    sla_deadline TIMESTAMPTZ, -- When it escalates
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT valid_hitl_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_hitl_status CHECK (status IN ('open', 'approved', 'rejected', 'escalated'))
);

-- RLS
ALTER TABLE hitl_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_hitl_isolation ON hitl_exceptions
    FOR ALL USING (tenant_id = auth.uid());

-- Indexes
CREATE INDEX idx_hitl_status ON hitl_exceptions (status);
CREATE INDEX idx_hitl_tenant_agent ON hitl_exceptions (tenant_id, agent_id);
CREATE INDEX idx_hitl_sla ON hitl_exceptions (sla_deadline) WHERE status = 'open';
