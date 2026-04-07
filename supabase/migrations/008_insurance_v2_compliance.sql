-- supabase/migrations/008_insurance_v2_compliance.sql

-- Refactor insurance_claims to include claim_state and compliance metadata
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='status') THEN
        ALTER TABLE insurance_claims RENAME COLUMN status TO claim_state;
    END IF;
END $$;

ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS compliance_metadata JSONB DEFAULT '{}'; -- FCRA/NAIC rules applied
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS external_reference_id TEXT; -- For Guidewire/ClaimCenter

-- Update agent_risk_profiles to include fraud_history
ALTER TABLE agent_risk_profiles ADD COLUMN IF NOT EXISTS fraud_events_count INTEGER DEFAULT 0;

-- Audit Log for migrations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM audit_events WHERE request_id = '00000000-0000-0000-0000-000000000008') THEN
        INSERT INTO audit_events (event_type, module, tenant_id, request_id, payload, signature)
        SELECT 'system.migration_applied', 's5', id, '00000000-0000-0000-0000-000000000008', '{"version": 2, "changes": ["claim_state", "fraud_score", "compliance"]}', 'migration_override_sig'
        FROM tenants
        LIMIT 1;
    END IF;
END $$;
