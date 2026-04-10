-- ============================================================
-- Migration 034: S9 Agent FinOps Control Plane
-- Per-agent and per-tenant budget caps with atomic spend tracking.
-- cost_events is immutable (no UPDATE/DELETE allowed).
-- ============================================================

-- Agent budgets: hard or soft caps per agent per scope
CREATE TABLE IF NOT EXISTS agent_budgets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID        NULL,  -- NULL = tenant-wide budget
  scope_type    TEXT        NOT NULL DEFAULT 'monthly' CHECK (scope_type IN ('daily', 'weekly', 'monthly', 'total')),
  budget_usd    NUMERIC(14,6) NOT NULL,
  spent_usd     NUMERIC(14,6) NOT NULL DEFAULT 0,
  hard_block    BOOLEAN     NOT NULL DEFAULT true,   -- true = block when exceeded
  alert_at      NUMERIC(4,2) NOT NULL DEFAULT 0.80,  -- alert at 80% by default
  period_start  TIMESTAMPTZ NULL,
  period_end    TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_id, scope_type)
);

ALTER TABLE agent_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_manage_budgets"
  ON agent_budgets FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Cost events: immutable ledger (no UPDATE, no DELETE)
CREATE TABLE IF NOT EXISTS cost_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id),
  agent_id      UUID        NULL,
  provider      TEXT        NOT NULL,
  model         TEXT        NOT NULL,
  input_tokens  INTEGER     NOT NULL DEFAULT 0,
  output_tokens INTEGER     NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(14,6) NOT NULL,
  workflow_id   TEXT        NULL,
  certificate_id UUID       NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent any modification to cost_events (immutable ledger)
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_cost_events"
  ON cost_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE INDEX idx_cost_events_tenant_created ON cost_events(tenant_id, created_at DESC);
CREATE INDEX idx_cost_events_agent ON cost_events(agent_id, created_at DESC);
CREATE INDEX idx_agent_budgets_tenant ON agent_budgets(tenant_id);

-- Atomic increment function (SECURITY DEFINER avoids RLS for internal operations)
CREATE OR REPLACE FUNCTION increment_budget_spend(
  p_tenant_id UUID,
  p_agent_id  UUID,
  p_cost      NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update agent-specific budget if it exists
  UPDATE agent_budgets
  SET spent_usd = spent_usd + p_cost,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND agent_id = p_agent_id;

  -- Update tenant-wide budget if it exists (agent_id IS NULL)
  UPDATE agent_budgets
  SET spent_usd = spent_usd + p_cost,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND agent_id IS NULL;
END;
$$;
