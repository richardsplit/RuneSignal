-- Migration 045: Post-Quantum Cryptography signature column
-- Adds ML-DSA-65 (CRYSTALS-Dilithium) dual-signature support to audit_events.
-- When ENABLE_PQC=true the ledger service dual-signs with Ed25519 (existing) + ML-DSA-65.

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS pqc_signature TEXT;

-- Index to efficiently query PQC-signed events for compliance audits
CREATE INDEX IF NOT EXISTS idx_audit_events_pqc
  ON audit_events(tenant_id, created_at DESC)
  WHERE pqc_signature IS NOT NULL;

COMMENT ON COLUMN audit_events.pqc_signature IS
  'ML-DSA-65 (CRYSTALS-Dilithium) post-quantum signature. Populated when ENABLE_PQC=true. NULL for legacy events signed only with Ed25519.';
