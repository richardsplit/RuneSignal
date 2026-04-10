-- ============================================================
-- Migration 041: S16 A2A Protocol Governance Gateway
-- Dual-signature A2A handshake protocol with full governance
-- pipeline (S1 + S8 checks on acceptance). Immutable message log.
-- ============================================================

-- a2a_handshakes already exists from 020_a2a_gateway.sql.
-- Old schema: initiator_id TEXT, responder_id TEXT, status had 'rejected'/'completed'.
-- New schema: initiator_id UUID, responder_id UUID, updated status values.
-- We keep existing data; add missing columns idempotently.
CREATE TABLE IF NOT EXISTS a2a_handshakes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  initiator_id    UUID        NOT NULL,
  responder_id    UUID        NOT NULL,
  terms_hash      TEXT        NOT NULL,
  terms_payload   JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'governance_blocked', 'expired', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No new columns needed beyond what 020 had.
-- Ensure created_at/updated_at are NOT NULL with defaults.
UPDATE a2a_handshakes SET created_at = now() WHERE created_at IS NULL;
UPDATE a2a_handshakes SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE a2a_handshakes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE a2a_handshakes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE a2a_handshakes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE a2a_handshakes ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE a2a_handshakes ENABLE ROW LEVEL SECURITY;

-- Drop old policies from 020
DROP POLICY IF EXISTS a2a_handshakes_tenant   ON a2a_handshakes;
DROP POLICY IF EXISTS tenant_read_handshakes  ON a2a_handshakes;
DROP POLICY IF EXISTS service_manage_handshakes ON a2a_handshakes;

CREATE POLICY "tenant_read_handshakes"
  ON a2a_handshakes FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_handshakes"
  ON a2a_handshakes FOR ALL USING (true) WITH CHECK (true);

-- a2a_signatures already exists from 020.
-- Old schema: agent_id TEXT, created_at not signed_at.
-- New schema: agent_id UUID, signed_at. Keep both columns.
CREATE TABLE IF NOT EXISTS a2a_signatures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  handshake_id    UUID        NOT NULL REFERENCES a2a_handshakes(id) ON DELETE CASCADE,
  agent_id        UUID        NOT NULL,
  signature_payload TEXT      NOT NULL,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (handshake_id, agent_id)
);

ALTER TABLE a2a_signatures
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill signed_at from created_at if it existed under that name in 020
UPDATE a2a_signatures SET signed_at = now() WHERE signed_at IS NULL;

ALTER TABLE a2a_signatures ENABLE ROW LEVEL SECURITY;

-- Drop old policies from 020
DROP POLICY IF EXISTS a2a_signatures_tenant    ON a2a_signatures;
DROP POLICY IF EXISTS service_manage_signatures ON a2a_signatures;

CREATE POLICY "service_manage_signatures"
  ON a2a_signatures FOR ALL USING (true) WITH CHECK (true);

-- A2A sessions — new table, safe
CREATE TABLE IF NOT EXISTS a2a_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  handshake_id    UUID        NULL REFERENCES a2a_handshakes(id),
  initiator_id    UUID        NOT NULL,
  target_id       UUID        NOT NULL,
  task_description TEXT       NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'blocked', 'expired')),
  verdict         TEXT        NOT NULL CHECK (verdict IN ('allowed', 'blocked')),
  signature       TEXT        NOT NULL,
  message_count   INTEGER     NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ NULL
);

ALTER TABLE a2a_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read_a2a_sessions  ON a2a_sessions;
DROP POLICY IF EXISTS service_manage_a2a_sessions ON a2a_sessions;

CREATE POLICY "tenant_read_a2a_sessions"
  ON a2a_sessions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_a2a_sessions"
  ON a2a_sessions FOR ALL USING (true) WITH CHECK (true);

-- A2A messages — new table, immutable (no UPDATE/DELETE), per-hop signed
CREATE TABLE IF NOT EXISTS a2a_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES a2a_sessions(id),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  from_agent_id   UUID        NOT NULL,
  to_agent_id     UUID        NOT NULL,
  content_hash    TEXT        NOT NULL,
  signature       TEXT        NOT NULL,
  message_type    TEXT        NOT NULL DEFAULT 'task'
    CHECK (message_type IN ('task', 'result', 'error', 'heartbeat')),
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE a2a_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_read_a2a_messages  ON a2a_messages;
DROP POLICY IF EXISTS service_insert_a2a_messages ON a2a_messages;

CREATE POLICY "tenant_read_a2a_messages"
  ON a2a_messages FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_a2a_messages"
  ON a2a_messages FOR INSERT WITH CHECK (true);

-- Indexes — use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_handshakes_tenant     ON a2a_handshakes(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handshakes_initiator  ON a2a_handshakes(initiator_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_signatures_handshake  ON a2a_signatures(handshake_id);
CREATE INDEX IF NOT EXISTS idx_a2a_sessions_tenant   ON a2a_sessions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_session  ON a2a_messages(session_id, created_at ASC);
