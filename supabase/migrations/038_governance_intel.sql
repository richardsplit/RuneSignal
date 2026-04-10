-- ============================================================
-- Migration 038: S13 Governance Intelligence Hub
-- Compliance frameworks catalog + per-control evidence mapping.
-- Seeded with EU AI Act, NIST RMF, SOC 2 Type II controls.
-- ============================================================

-- compliance_frameworks already exists from 016_governance_intel.sql.
-- That version lacked: short_name, jurisdiction, is_active, (name was not UNIQUE).
-- We add missing columns and constraints idempotently.
CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  short_name  TEXT    NOT NULL DEFAULT '',
  jurisdiction TEXT   NOT NULL DEFAULT 'Global',
  description TEXT    NOT NULL DEFAULT '',
  version     TEXT    NOT NULL DEFAULT '1.0',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   UUID    NULL REFERENCES tenants(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE compliance_frameworks
  ADD COLUMN IF NOT EXISTS short_name   TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT    NOT NULL DEFAULT 'Global',
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure description/version have defaults in case they're nullable from 016
ALTER TABLE compliance_frameworks
  ALTER COLUMN description SET DEFAULT '',
  ALTER COLUMN version      SET DEFAULT '1.0';

-- Add UNIQUE constraint on name if not already there (needed for ON CONFLICT seeds)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'compliance_frameworks_name_key'
      AND conrelid = 'compliance_frameworks'::regclass
  ) THEN
    ALTER TABLE compliance_frameworks ADD CONSTRAINT compliance_frameworks_name_key UNIQUE (name);
  END IF;
END $$;

-- framework_controls already exists from 016.
-- 016 lacked: evidence_types. Also lacked UNIQUE(framework_id, control_code).
CREATE TABLE IF NOT EXISTS framework_controls (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    UUID    NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  control_code    TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  evidence_types  TEXT[]  NOT NULL DEFAULT '{}',
  UNIQUE (framework_id, control_code)
);

ALTER TABLE framework_controls
  ADD COLUMN IF NOT EXISTS evidence_types TEXT[] NOT NULL DEFAULT '{}';

-- Add UNIQUE constraint on (framework_id, control_code) if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'framework_controls_framework_id_control_code_key'
      AND conrelid = 'framework_controls'::regclass
  ) THEN
    ALTER TABLE framework_controls
      ADD CONSTRAINT framework_controls_framework_id_control_code_key
      UNIQUE (framework_id, control_code);
  END IF;
END $$;

-- control_evidence already exists from 016.
-- 016 had confidence_score NUMERIC (no precision). New wants NUMERIC(4,3).
-- 016 lacked UNIQUE(tenant_id, control_id, audit_event_id).
CREATE TABLE IF NOT EXISTS control_evidence (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  control_id      UUID        NOT NULL REFERENCES framework_controls(id),
  audit_event_id  UUID        NULL,
  evidence_text   TEXT        NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.9,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, control_id, audit_event_id)
);

ALTER TABLE control_evidence
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add UNIQUE constraint on (tenant_id, control_id, audit_event_id) if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'control_evidence_tenant_id_control_id_audit_event_id_key'
      AND conrelid = 'control_evidence'::regclass
  ) THEN
    ALTER TABLE control_evidence
      ADD CONSTRAINT control_evidence_tenant_id_control_id_audit_event_id_key
      UNIQUE (tenant_id, control_id, audit_event_id);
  END IF;
END $$;

-- RLS (already enabled in 016)
ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_controls    ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_evidence      ENABLE ROW LEVEL SECURITY;

-- Drop old policies from 016
DROP POLICY IF EXISTS fw_select                 ON compliance_frameworks;
DROP POLICY IF EXISTS fc_select                 ON framework_controls;
DROP POLICY IF EXISTS ce_select                 ON control_evidence;
DROP POLICY IF EXISTS public_read_frameworks    ON compliance_frameworks;
DROP POLICY IF EXISTS service_manage_frameworks ON compliance_frameworks;
DROP POLICY IF EXISTS public_read_controls      ON framework_controls;
DROP POLICY IF EXISTS service_manage_controls   ON framework_controls;
DROP POLICY IF EXISTS tenant_read_evidence      ON control_evidence;
DROP POLICY IF EXISTS service_manage_evidence   ON control_evidence;

CREATE POLICY "public_read_frameworks"    ON compliance_frameworks FOR SELECT USING (true);
CREATE POLICY "service_manage_frameworks" ON compliance_frameworks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read_controls"      ON framework_controls FOR SELECT USING (true);
CREATE POLICY "service_manage_controls"   ON framework_controls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tenant_read_evidence"
  ON control_evidence FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_evidence"
  ON control_evidence FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_control_evidence_tenant ON control_evidence(tenant_id, control_id);
CREATE INDEX IF NOT EXISTS idx_framework_controls_fw   ON framework_controls(framework_id);

-- ─── Seed: Regulatory Frameworks ─────────────────────────────────────────────
-- ON CONFLICT (name) requires the UNIQUE constraint above.
INSERT INTO compliance_frameworks (name, short_name, jurisdiction, version, description) VALUES
('EU Artificial Intelligence Act', 'EU AI Act', 'EU', '2024', 'Horizontal regulation for AI systems across the EU. High-risk systems require human oversight, transparency, and quality management.'),
('NIST AI Risk Management Framework', 'NIST RMF', 'US', '1.0', 'Voluntary framework for managing AI risks across Govern, Map, Measure, and Manage functions.'),
('SOC 2 Type II', 'SOC 2', 'US', '2022', 'Trust Services Criteria for security, availability, confidentiality, and privacy.')
ON CONFLICT (name) DO UPDATE
  SET short_name   = EXCLUDED.short_name,
      jurisdiction = EXCLUDED.jurisdiction,
      version      = EXCLUDED.version,
      description  = EXCLUDED.description;

-- ─── Seed: EU AI Act Controls ─────────────────────────────────────────────────
WITH fw AS (SELECT id FROM compliance_frameworks WHERE short_name = 'EU AI Act')
INSERT INTO framework_controls (framework_id, control_code, title, description, evidence_types)
SELECT fw.id, ctrl.code, ctrl.title, ctrl.desc, ctrl.ev FROM fw, (VALUES
  ('ART-13', 'Transparency', 'High-risk AI systems must be transparent and provide meaningful information about their logic.', ARRAY['provenance_certificate', 'decision_explanation']),
  ('ART-14', 'Human Oversight', 'Human oversight measures to prevent or minimise risks.', ARRAY['hitl_exception', 'audit_event']),
  ('ART-15', 'Accuracy & Robustness', 'High-risk AI systems must be accurate, robust, and cybersecure.', ARRAY['behavioral_anomaly', 'audit_event']),
  ('ART-17', 'Quality Management', 'Quality management system for high-risk AI.', ARRAY['audit_event', 'provenance_certificate']),
  ('ART-50', 'Transparency for General AI', 'Obligations for general-purpose AI transparency.', ARRAY['decision_explanation'])
) AS ctrl(code, title, desc, ev) ON CONFLICT (framework_id, control_code) DO UPDATE
  SET title          = EXCLUDED.title,
      description    = EXCLUDED.description,
      evidence_types = EXCLUDED.evidence_types;

-- ─── Seed: NIST RMF Controls ─────────────────────────────────────────────────
WITH fw AS (SELECT id FROM compliance_frameworks WHERE short_name = 'NIST RMF')
INSERT INTO framework_controls (framework_id, control_code, title, description, evidence_types)
SELECT fw.id, ctrl.code, ctrl.title, ctrl.desc, ctrl.ev FROM fw, (VALUES
  ('GOVERN-1', 'AI Governance', 'Policies, processes, and practices for AI risk management.', ARRAY['audit_event', 'policy_enforcement']),
  ('MAP-1', 'AI Risk Identification', 'Categorize and contextualize AI risks.', ARRAY['firewall_evaluation', 'risk_score']),
  ('MAP-2', 'AI Inventory', 'Identify and document AI systems in use.', ARRAY['agent_registration']),
  ('MEASURE-1', 'AI Risk Analysis', 'Analyse and assess AI risks.', ARRAY['provenance_certificate', 'behavioral_anomaly']),
  ('MANAGE-1', 'AI Risk Response', 'Prioritize and implement risk responses.', ARRAY['hitl_exception', 'firewall_evaluation'])
) AS ctrl(code, title, desc, ev) ON CONFLICT (framework_id, control_code) DO UPDATE
  SET title          = EXCLUDED.title,
      description    = EXCLUDED.description,
      evidence_types = EXCLUDED.evidence_types;

-- ─── Seed: SOC 2 Controls ────────────────────────────────────────────────────
WITH fw AS (SELECT id FROM compliance_frameworks WHERE short_name = 'SOC 2')
INSERT INTO framework_controls (framework_id, control_code, title, description, evidence_types)
SELECT fw.id, ctrl.code, ctrl.title, ctrl.desc, ctrl.ev FROM fw, (VALUES
  ('CC1.1', 'Control Environment', 'Management demonstrates commitment to integrity and ethical values.', ARRAY['audit_event', 'policy_enforcement']),
  ('CC5.1', 'Risk Assessment', 'Assess risk of achieving objectives.', ARRAY['risk_score', 'behavioral_anomaly']),
  ('CC6.1', 'Logical Access Controls', 'Restrict logical access to systems.', ARRAY['identity_check', 'audit_event']),
  ('CC7.1', 'System Monitoring', 'Monitor system components for anomalies.', ARRAY['behavioral_anomaly', 'audit_event']),
  ('CC9.1', 'Risk Mitigation', 'Identify and mitigate risks from vendors and partners.', ARRAY['firewall_evaluation', 'provenance_certificate'])
) AS ctrl(code, title, desc, ev) ON CONFLICT (framework_id, control_code) DO UPDATE
  SET title          = EXCLUDED.title,
      description    = EXCLUDED.description,
      evidence_types = EXCLUDED.evidence_types;
