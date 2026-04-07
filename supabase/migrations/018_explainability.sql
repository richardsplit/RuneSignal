-- S11 AI Decision Explainability Engine Schema

CREATE TABLE IF NOT EXISTS certificate_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    certificate_id TEXT NOT NULL UNIQUE, -- References audit_events.request_id conceptually
    causal_factors TEXT[],
    decision_summary TEXT NOT NULL,
    regulatory_mapping JSONB DEFAULT '{}'::jsonb,
    is_human_readable BOOLEAN DEFAULT true,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_used TEXT NOT NULL
);

ALTER TABLE certificate_explanations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ce_tenant ON certificate_explanations;
CREATE POLICY ce_tenant ON certificate_explanations FOR SELECT USING (tenant_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_cert_expl_cert_id ON certificate_explanations(certificate_id);
