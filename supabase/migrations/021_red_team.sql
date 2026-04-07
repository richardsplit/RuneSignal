-- S17 Continuous Red Teaming Engine Schema

CREATE TABLE IF NOT EXISTS red_team_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    target_agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    total_attacks INTEGER DEFAULT 0,
    successful_defenses INTEGER DEFAULT 0,
    resilience_score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS red_team_attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES red_team_campaigns(id) ON DELETE CASCADE,
    attack_vector TEXT NOT NULL, -- 'jailbreak', 'injection', 'extraction', 'roleplay_bypass'
    prompt_used TEXT NOT NULL,
    agent_response TEXT,
    was_defended BOOLEAN NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE red_team_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_team_attacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rtc_tenant ON red_team_campaigns;
DROP POLICY IF EXISTS rta_tenant ON red_team_attacks;

CREATE POLICY rtc_tenant ON red_team_campaigns FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY rta_tenant ON red_team_attacks FOR ALL USING (
    campaign_id IN (SELECT id FROM red_team_campaigns WHERE tenant_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_rta_campaign ON red_team_attacks(campaign_id, executed_at DESC);
