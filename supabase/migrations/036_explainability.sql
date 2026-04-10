-- ============================================================
-- Migration 036: S11 AI Decision Explainability Engine
-- Per-certificate explanations. Public SELECT — regulators
-- can query by certificate_id without authentication.
-- ============================================================

-- Table may already exist from 018_explainability.sql with a narrower schema.
-- Use CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS pattern.
CREATE TABLE IF NOT EXISTS certificate_explanations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id),
  agent_id          UUID        NULL,
  certificate_id    UUID        NULL,   -- links to provenance_certificates.id
  key_factors       JSONB       NOT NULL DEFAULT '[]',
  -- [{ factor: string, weight: 0.0–1.0, direction: "positive"|"negative" }]
  counterfactual    TEXT        NULL,   -- "If X had been Y, the output would have been Z"
  decision_summary  TEXT        NOT NULL DEFAULT '',
  confidence_score  NUMERIC(4,3) NOT NULL DEFAULT 0,
  regulatory_refs   TEXT[]      NOT NULL DEFAULT '{}',
  -- e.g. ['EU AI Act Art 13', 'GDPR Art 22', 'FCRA §615']
  model_used        TEXT        NULL,   -- model used to generate explanation
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ NULL
);

-- Add columns that may be missing from the 018 version
ALTER TABLE certificate_explanations
  ADD COLUMN IF NOT EXISTS agent_id          UUID        NULL,
  ADD COLUMN IF NOT EXISTS key_factors       JSONB       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS counterfactual    TEXT        NULL,
  ADD COLUMN IF NOT EXISTS confidence_score  NUMERIC(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regulatory_refs   TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status            TEXT        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ NULL;

-- Ensure decision_summary has a default (018 had NOT NULL with no default)
ALTER TABLE certificate_explanations ALTER COLUMN decision_summary SET DEFAULT '';

-- RLS (already enabled in 018 — safe to call again)
ALTER TABLE certificate_explanations ENABLE ROW LEVEL SECURITY;

-- Drop old policy from 018 before creating new ones
DROP POLICY IF EXISTS ce_tenant ON certificate_explanations;
DROP POLICY IF EXISTS public_read_explanations ON certificate_explanations;
DROP POLICY IF EXISTS tenant_insert_explanations ON certificate_explanations;

CREATE POLICY "public_read_explanations"
  ON certificate_explanations FOR SELECT USING (true);
CREATE POLICY "tenant_insert_explanations"
  ON certificate_explanations FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Indexes — use IF NOT EXISTS to guard against duplicates from 018
CREATE INDEX IF NOT EXISTS idx_explanations_cert   ON certificate_explanations(certificate_id);
CREATE INDEX IF NOT EXISTS idx_explanations_tenant ON certificate_explanations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_explanations_agent  ON certificate_explanations(agent_id);
