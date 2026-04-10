-- ============================================================
-- Migration 037: S12 Non-Human Identity (NHI) Lifecycle Manager
-- Credential rotation history (immutable) and agent spawn graph.
-- Extends api_keys with delegation metadata.
-- ============================================================

-- Credential rotation history — immutable (no UPDATE/DELETE)
-- 017_nhi_lifecycle.sql already created nhi_key_rotations; this is a
-- richer replacement table named credential_rotations — new, safe.
CREATE TABLE IF NOT EXISTS credential_rotations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id),
  agent_id          UUID        NOT NULL,
  old_key_id        UUID        NULL,
  new_key_id        UUID        NULL,
  reason            TEXT        NOT NULL,
  death_certificate TEXT        NULL,  -- Ed25519 signature over old_key_id + revocation_time
  rotated_by        TEXT        NULL,  -- 'system:auto-rotation' or user email
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE credential_rotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read_rotations ON credential_rotations;
CREATE POLICY "tenant_read_rotations"
  ON credential_rotations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Agent spawn graph — already exists from 025_nhi_spawn_graph.sql
-- That version had: child_key_id NOT NULL, max_minutes, spawned_at, expires_at NOT NULL.
-- This version uses created_at (not spawned_at) and makes child_key_id/expires_at nullable.
-- We keep the existing table and add any missing columns.
CREATE TABLE IF NOT EXISTS agent_spawn_graph (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  parent_agent_id UUID        NOT NULL,
  child_key_id    UUID        NULL,
  purpose         TEXT        NOT NULL,
  delegation_depth INTEGER    NOT NULL DEFAULT 1,
  expires_at      TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_spawn_graph
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT now();
-- spawned_at already exists from 025; created_at is the new name — both will coexist, no harm.

ALTER TABLE agent_spawn_graph ENABLE ROW LEVEL SECURITY;

-- Drop old policies before creating named ones
DROP POLICY IF EXISTS spawn_tenant ON agent_spawn_graph;
DROP POLICY IF EXISTS tenant_read_spawn_graph ON agent_spawn_graph;
DROP POLICY IF EXISTS service_insert_spawn_graph ON agent_spawn_graph;

CREATE POLICY "tenant_read_spawn_graph"
  ON agent_spawn_graph FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_spawn_graph"
  ON agent_spawn_graph FOR INSERT WITH CHECK (true);

-- Extend api_keys with NHI lifecycle metadata (all IF NOT EXISTS — safe)
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS delegation_depth    INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_agent_id     UUID        NULL,
  ADD COLUMN IF NOT EXISTS max_session_minutes INTEGER     NULL,
  ADD COLUMN IF NOT EXISTS auto_rotate_days    INTEGER     NULL,
  ADD COLUMN IF NOT EXISTS next_rotation_at    TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS credential_class    TEXT        NOT NULL DEFAULT 'standard';

-- Add CHECK constraint on credential_class only if not already there
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'api_keys_credential_class_check'
      AND conrelid = 'api_keys'::regclass
  ) THEN
    ALTER TABLE api_keys ADD CONSTRAINT api_keys_credential_class_check
      CHECK (credential_class IN ('standard', 'ephemeral', 'service'));
  END IF;
END $$;

-- Indexes — use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_api_keys_parent         ON api_keys(parent_agent_id)    WHERE parent_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_next_rotation  ON api_keys(next_rotation_at)   WHERE next_rotation_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spawn_graph_parent      ON agent_spawn_graph(parent_agent_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_credential_rotations_agent ON credential_rotations(agent_id, tenant_id);
