-- supabase/migrations/006_insurance_os.sql

-- Coverage Policies
CREATE TABLE coverage_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    plan_name TEXT NOT NULL,
    max_liability_limit NUMERIC NOT NULL,
    deductible NUMERIC NOT NULL,
    base_premium NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent Risk Telemetry (Snapshot of agent health/risk)
CREATE TABLE agent_risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL REFERENCES agent_credentials(id) UNIQUE,
    risk_score INTEGER NOT NULL, -- 0-100 (100 = highest risk)
    total_violations INTEGER NOT NULL DEFAULT 0,
    hitl_escalations INTEGER NOT NULL DEFAULT 0,
    model_version_anomalies INTEGER NOT NULL DEFAULT 0,
    last_computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insurance Claims / Incidents
CREATE TABLE insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL REFERENCES agent_credentials(id),
    incident_type TEXT NOT NULL,
    financial_impact NUMERIC NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'filed', -- filed | investigating | approved | denied
    filed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE coverage_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_coverage_isolation ON coverage_policies FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY tenant_risk_isolation ON agent_risk_profiles FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY tenant_claim_isolation ON insurance_claims FOR ALL USING (tenant_id = auth.uid());
