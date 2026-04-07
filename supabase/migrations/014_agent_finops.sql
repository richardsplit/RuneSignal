-- Budget configurations (per-agent, per-tenant, per-workflow)
CREATE TABLE IF NOT EXISTS agent_budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  agent_id    UUID REFERENCES agent_credentials(id),
  scope_type  TEXT NOT NULL DEFAULT 'monthly',        -- 'monthly' | 'session' | 'workflow'
  budget_usd  NUMERIC NOT NULL,
  spent_usd   NUMERIC NOT NULL DEFAULT 0,
  alert_at    NUMERIC NOT NULL DEFAULT 0.8,           -- alert threshold (fraction)
  hard_block  BOOLEAN NOT NULL DEFAULT true,          -- block vs. warn only
  resets_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, agent_id, scope_type)
);

-- Immutable cost event ledger (one row per LLM call)
CREATE TABLE IF NOT EXISTS cost_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  agent_id        UUID,
  workflow_id     TEXT,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  cost_usd        NUMERIC(10,6) NOT NULL,
  certificate_id  TEXT,   -- links to audit_events.request_id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutability rules
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'no_update_cost') THEN
        CREATE RULE no_update_cost AS ON UPDATE TO cost_events DO INSTEAD NOTHING;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'no_delete_cost') THEN
        CREATE RULE no_delete_cost AS ON DELETE TO cost_events DO INSTEAD NOTHING;
    END IF;
END $$;


CREATE INDEX IF NOT EXISTS idx_cost_tenant_ts ON cost_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_agent    ON cost_events (agent_id, created_at DESC);

-- Atomic budget spend updater (called after every LLM call)
CREATE OR REPLACE FUNCTION increment_budget_spend(
  p_tenant_id UUID, p_agent_id UUID, p_cost NUMERIC
) RETURNS VOID AS $$
BEGIN
  UPDATE agent_budgets SET spent_usd = spent_usd + p_cost
  WHERE tenant_id = p_tenant_id
    AND (agent_id = p_agent_id OR agent_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE agent_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budget_tenant ON agent_budgets;
DROP POLICY IF EXISTS cost_tenant ON cost_events;

CREATE POLICY budget_tenant ON agent_budgets FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY cost_tenant   ON cost_events   FOR SELECT USING (tenant_id = auth.uid());
