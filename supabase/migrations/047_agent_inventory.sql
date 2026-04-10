-- 047_agent_inventory.sql
-- Agent Inventory & Shadow AI Discovery

CREATE TABLE IF NOT EXISTS agent_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  framework TEXT DEFAULT 'unknown',       -- 'langchain' | 'autogen' | 'crewai' | 'custom' | 'unknown'
  platform TEXT DEFAULT 'custom',         -- 'openai' | 'anthropic' | 'azure' | 'aws' | 'custom'
  model TEXT,
  owner_user_id UUID,
  status TEXT DEFAULT 'active',           -- 'active' | 'inactive' | 'shadow' | 'decommissioned'
  risk_classification TEXT DEFAULT 'unclassified', -- 'low' | 'medium' | 'high' | 'critical'
  discovery_method TEXT DEFAULT 'manual', -- 'sdk' | 'oauth_scan' | 'api_key' | 'manual'
  is_sanctioned BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ,
  eu_ai_act_category TEXT DEFAULT 'unclassified', -- 'prohibited' | 'high_risk' | 'limited_risk' | 'minimal_risk'
  metadata JSONB DEFAULT '{}',
  CONSTRAINT agent_inventory_status_check CHECK (status IN ('active', 'inactive', 'shadow', 'decommissioned')),
  CONSTRAINT agent_inventory_risk_check CHECK (risk_classification IN ('unclassified', 'low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_agent_inventory_org_id ON agent_inventory(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_inventory_status ON agent_inventory(status);
CREATE INDEX IF NOT EXISTS idx_agent_inventory_is_sanctioned ON agent_inventory(is_sanctioned);
CREATE INDEX IF NOT EXISTS idx_agent_inventory_risk ON agent_inventory(risk_classification);

-- Down migration:
-- DROP TABLE IF EXISTS agent_inventory;
