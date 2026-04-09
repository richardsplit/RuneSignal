-- ============================================================
-- Migration 041: S16 A2A Protocol Governance Gateway
-- Dual-signature A2A handshake protocol with full governance
-- pipeline (S1 + S8 checks on acceptance). Immutable message log.
-- ============================================================

-- A2A handshakes — governed cross-agent delegation contracts
CREATE TABLE IF NOT EXISTS a2a_handshakes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  initiator_id    UUID        NOT NULL,   -- agent that initiated the delegation
  responder_id    UUID        NOT NULL,   -- target agent
  terms_hash      TEXT        NOT NULL,   -- SHA-256 of terms_payload
  terms_payload   JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'governance_blocked', 'expired', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE a2a_handshakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_handshakes"
  ON a2a_handshakes FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_handshakes"
  ON a2a_handshakes FOR ALL USING (true) WITH CHECK (true);

-- Agent signatures on handshakes (dual-sign requirement)
CREATE TABLE IF NOT EXISTS a2a_signatures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  handshake_id    UUID        NOT NULL REFERENCES a2a_handshakes(id) ON DELETE CASCADE,
  agent_id        UUID        NOT NULL,
  signature_payload TEXT      NOT NULL,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (handshake_id, agent_id)
);

ALTER TABLE a2a_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_signatures"
  ON a2a_signatures FOR ALL USING (true) WITH CHECK (true);

-- A2A sessions — governed active communication channels (post-handshake)
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
  signature       TEXT        NOT NULL,   -- Ed25519 session signature
  message_count   INTEGER     NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ NULL
);

ALTER TABLE a2a_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_a2a_sessions"
  ON a2a_sessions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_a2a_sessions"
  ON a2a_sessions FOR ALL USING (true) WITH CHECK (true);

-- A2A messages — immutable (no UPDATE/DELETE), per-hop signed
CREATE TABLE IF NOT EXISTS a2a_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES a2a_sessions(id),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  from_agent_id   UUID        NOT NULL,
  to_agent_id     UUID        NOT NULL,
  content_hash    TEXT        NOT NULL,   -- SHA-256 of message content
  signature       TEXT        NOT NULL,   -- Ed25519 per-hop signature
  message_type    TEXT        NOT NULL DEFAULT 'task'
    CHECK (message_type IN ('task', 'result', 'error', 'heartbeat')),
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE a2a_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_a2a_messages"
  ON a2a_messages FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_a2a_messages"
  ON a2a_messages FOR INSERT WITH CHECK (true);

CREATE INDEX idx_handshakes_tenant ON a2a_handshakes(tenant_id, created_at DESC);
CREATE INDEX idx_handshakes_initiator ON a2a_handshakes(initiator_id, tenant_id);
CREATE INDEX idx_signatures_handshake ON a2a_signatures(handshake_id);
CREATE INDEX idx_a2a_sessions_tenant ON a2a_sessions(tenant_id, created_at DESC);
CREATE INDEX idx_a2a_messages_session ON a2a_messages(session_id, created_at ASC);
