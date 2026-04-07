-- NHI Spawn Graph — tracks agent spawning lineage
CREATE TABLE IF NOT EXISTS agent_spawn_graph (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  parent_agent_id UUID NOT NULL,  -- The agent that spawned the child
  child_key_id   UUID NOT NULL REFERENCES api_keys(id),
  purpose        TEXT NOT NULL,
  max_minutes    INTEGER NOT NULL DEFAULT 60,
  delegation_depth INTEGER NOT NULL DEFAULT 0,  -- Depth from root agent
  spawned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

-- Prevent infinite spawning chains
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS parent_agent_id UUID;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS delegation_depth INTEGER DEFAULT 0;

ALTER TABLE agent_spawn_graph ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'spawn_tenant') THEN
        CREATE POLICY spawn_tenant ON agent_spawn_graph FOR ALL USING (tenant_id = auth.uid());
    END IF;
END $$;
