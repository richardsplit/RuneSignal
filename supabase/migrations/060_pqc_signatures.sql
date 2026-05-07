-- Migration 060: PQC Dual-Signature column (Phase 11 — ML-DSA-65)
-- Adds pqc_signature column to audit_events for post-quantum backup signature.
-- Activated when FEATURE_PQC=true in environment.
-- EU AI Act Article 15 — cybersecurity robustness, future-proof signing.

alter table audit_events
  add column if not exists pqc_signature  text,
  add column if not exists pqc_algorithm  text default 'ML-DSA-65',
  add column if not exists pqc_signed_at  timestamptz;

comment on column audit_events.pqc_signature is
  'ML-DSA-65 post-quantum backup signature (base64). Present when FEATURE_PQC=true.';
comment on column audit_events.pqc_algorithm is
  'PQC signing algorithm identifier — ML-DSA-65 per NIST FIPS 204.';
