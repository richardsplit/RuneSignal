ALTER TABLE compliance_reports
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS regulation TEXT,
  ADD COLUMN IF NOT EXISTS attestation_signature TEXT,
  ADD COLUMN IF NOT EXISTS attestation_key_id TEXT,
  ADD COLUMN IF NOT EXISTS generated_by UUID;

CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant_regulation
  ON compliance_reports(org_id, regulation, generated_at DESC);

COMMENT ON COLUMN compliance_reports.attestation_signature IS 'Ed25519 signature of the JSON export hash';
COMMENT ON COLUMN compliance_reports.attestation_key_id IS 'Signing key identifier for key rotation support';
