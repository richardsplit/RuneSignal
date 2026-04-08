-- ============================================================
-- Migration 029: Firewall Evaluations
-- Records every unified governance evaluation from /api/v1/firewall/evaluate
-- ============================================================

CREATE TABLE IF NOT EXISTS firewall_evaluations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID        NOT NULL,
  action        TEXT        NOT NULL,
  resource      TEXT        NOT NULL,
  verdict       TEXT        NOT NULL CHECK (verdict IN ('allow', 'block', 'escalate')),
  risk_score    INTEGER     NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  checks        JSONB       NOT NULL DEFAULT '[]',
  reasons       TEXT[]      NOT NULL DEFAULT '{}',
  certificate_id UUID       NULL,   -- audit_events.id reference (soft link)
  hitl_ticket_id UUID       NULL REFERENCES hitl_exceptions(id) ON DELETE SET NULL,
  latency_ms    INTEGER     NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE firewall_evaluations ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own evaluations
CREATE POLICY "tenant_read_firewall_evaluations"
  ON firewall_evaluations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Service role can insert (used by FirewallService which runs as admin client)
CREATE POLICY "service_insert_firewall_evaluations"
  ON firewall_evaluations
  FOR INSERT
  WITH CHECK (true);

-- Evaluations are immutable — no UPDATE or DELETE for tenants
-- (service role can clean up if needed via admin tools)

-- ─── Indexes ────────────────────────────────────────────────
-- Primary query pattern: list recent evaluations for a tenant
CREATE INDEX idx_firewall_tenant_created
  ON firewall_evaluations (tenant_id, created_at DESC);

-- Filter by verdict for dashboard metrics
CREATE INDEX idx_firewall_verdict
  ON firewall_evaluations (tenant_id, verdict);

-- Filter by agent for per-agent risk history
CREATE INDEX idx_firewall_agent
  ON firewall_evaluations (agent_id, created_at DESC);

-- Filter escalations that have a linked HITL ticket
CREATE INDEX idx_firewall_hitl_ticket
  ON firewall_evaluations (hitl_ticket_id)
  WHERE hitl_ticket_id IS NOT NULL;
