-- supabase/migrations/008_insurance_v2_compliance.sql

-- Refactor insurance_claims to include claim_state and compliance metadata
ALTER TABLE insurance_claims RENAME COLUMN status TO claim_state;
ALTER TABLE insurance_claims ADD COLUMN compliance_metadata JSONB DEFAULT '{}'; -- FCRA/NAIC rules applied
ALTER TABLE insurance_claims ADD COLUMN fraud_score INTEGER DEFAULT 0;
ALTER TABLE insurance_claims ADD COLUMN external_reference_id TEXT; -- For Guidewire/ClaimCenter

-- Update agent_risk_profiles to include fraud_history
ALTER TABLE agent_risk_profiles ADD COLUMN fraud_events_count INTEGER DEFAULT 0;

-- Audit Log for migrations
INSERT INTO audit_events (event_type, module, tenant_id, request_id, payload)
SELECT 'system.migration_applied', 's5', id, '008-insurance-v2', '{"version": 2, "changes": ["claim_state", "fraud_score", "compliance"]}'
FROM tenants
LIMIT 1;
