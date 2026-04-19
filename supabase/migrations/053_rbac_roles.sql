-- supabase/migrations/053_rbac_roles.sql
-- CT-2: RBAC — Extend tenant_members.role with fine-grained RuneSignal role values.
--
-- Existing values:  'owner' | 'admin' | 'member'
-- Added values:     'compliance_officer' | 'engineer' | 'auditor'
--
-- Legacy values are preserved and normalised in lib/auth/roles.ts:
--   admin  → compliance_officer
--   member → engineer

-- 1. Drop existing CHECK constraint on role column (if any)
ALTER TABLE tenant_members
  DROP CONSTRAINT IF EXISTS tenant_members_role_check;

-- 2. Re-add constraint with the full set of allowed values
ALTER TABLE tenant_members
  ADD CONSTRAINT tenant_members_role_check
  CHECK (role IN ('owner', 'admin', 'member', 'compliance_officer', 'engineer', 'auditor'));

-- 3. Back-fill: migrate legacy 'admin' → 'compliance_officer', 'member' → 'engineer'
--    Run as a no-op if already migrated.
UPDATE tenant_members SET role = 'compliance_officer' WHERE role = 'admin';
UPDATE tenant_members SET role = 'engineer'           WHERE role = 'member';

-- 4. Tighten the constraint to the final set now that legacy values are gone
ALTER TABLE tenant_members
  DROP CONSTRAINT IF EXISTS tenant_members_role_check;

ALTER TABLE tenant_members
  ADD CONSTRAINT tenant_members_role_check
  CHECK (role IN ('owner', 'compliance_officer', 'engineer', 'auditor'));

-- 5. Update DEFAULT to 'engineer' (most restrictive non-auditor role)
ALTER TABLE tenant_members ALTER COLUMN role SET DEFAULT 'engineer';

-- 6. Add an index for fast role lookups used by resolveUserRole()
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_tenant
  ON tenant_members (user_id, tenant_id);

-- 7. Grant read access to service role
GRANT SELECT ON tenant_members TO service_role;
