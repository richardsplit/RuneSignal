-- supabase/migrations/010_auth_multi_tenancy.sql
-- Phase 1: Core Authentication & Multi-Tenancy

-- 1. Tenant Members Table (Linking Supabase Users to Tenants)
CREATE TABLE tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id)
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- 2. Add email column to tenants (for easier management, optional)
ALTER TABLE tenants ADD COLUMN owner_id UUID;

-- 3. Update RLS for tenants
-- Users can only see tenants they are members of
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;
CREATE POLICY tenant_membership_policy ON tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    );

-- Allow users to create tenants
CREATE POLICY tenant_creation_policy ON tenants
    FOR INSERT WITH CHECK (true);

-- 4. Update RLS for tenant_members
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_members_read_policy ON tenant_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY tenant_members_insert_policy ON tenant_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. Update RLS for audit_events (and others) to use tenant_members
DROP POLICY IF EXISTS audit_tenant_isolation_policy ON audit_events;
CREATE POLICY audit_membership_policy ON audit_events
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    );

-- 6. Grant permissions (all authenticated users can read/write their own memberships)
GRANT ALL ON tenant_members TO authenticated;
GRANT ALL ON tenants TO authenticated;
