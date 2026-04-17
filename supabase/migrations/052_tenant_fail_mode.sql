-- PR-X.3: Add configurable fail-open / fail-closed per tenant
-- Default 'open' preserves existing behaviour (backwards compatible).
ALTER TABLE tenants
  ADD COLUMN fail_mode TEXT NOT NULL DEFAULT 'open'
  CONSTRAINT tenants_fail_mode_check CHECK (fail_mode IN ('open', 'closed'));
