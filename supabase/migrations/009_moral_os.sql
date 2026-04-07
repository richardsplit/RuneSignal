-- supabase/migrations/009_moral_os.sql
-- Module S8: MoralOS (PromptGuard Enterprise)

-- Corporate SOUL profiles (versioned, signed, tenant-scoped)
CREATE TABLE IF NOT EXISTS moral_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    soul_json JSONB NOT NULL,
    signature TEXT NOT NULL,
    signed_by TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active SOUL per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_moral_profiles_active ON moral_profiles (tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_moral_profiles_tenant ON moral_profiles (tenant_id, version DESC);

-- Moral event audit trail
CREATE TABLE IF NOT EXISTS moral_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL,
    action_description TEXT NOT NULL,
    domain TEXT NOT NULL,
    verdict TEXT NOT NULL,
    conflict_reason TEXT,
    soul_version INTEGER NOT NULL,
    oob_ticket_id UUID,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutability rules (same pattern as audit_events)
CREATE OR REPLACE RULE no_update_moral_events AS ON UPDATE TO moral_events DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_moral_events AS ON DELETE TO moral_events DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_moral_events_tenant ON moral_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moral_events_agent ON moral_events (agent_id);
CREATE INDEX IF NOT EXISTS idx_moral_events_verdict ON moral_events (verdict);
CREATE INDEX IF NOT EXISTS idx_moral_events_domain ON moral_events (domain);

-- Row Level Security
ALTER TABLE moral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE moral_events ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'moral_profiles_tenant_isolation' AND tablename = 'moral_profiles') THEN
        CREATE POLICY moral_profiles_tenant_isolation ON moral_profiles
            FOR SELECT USING (tenant_id = auth.uid());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'moral_events_tenant_isolation' AND tablename = 'moral_events') THEN
        CREATE POLICY moral_events_tenant_isolation ON moral_events
            FOR SELECT USING (tenant_id = auth.uid());
    END IF;
END $$;
