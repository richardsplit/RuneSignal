-- ============================================================
-- Migration 038: S13 Governance Intelligence Hub
-- Compliance frameworks catalog + per-control evidence mapping.
-- Seeded with EU AI Act, NIST RMF, SOC 2 Type II controls.
-- ============================================================

-- Regulatory frameworks catalog (TrustLayer-managed)
CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  short_name  TEXT    NOT NULL,
  jurisdiction TEXT   NOT NULL,  -- 'EU', 'US', 'UK', 'Global'
  description TEXT    NOT NULL DEFAULT '',
  version     TEXT    NOT NULL DEFAULT '1.0',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   UUID    NULL REFERENCES tenants(id),  -- NULL = global (TrustLayer-managed)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public read (no auth required)
ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_frameworks" ON compliance_frameworks FOR SELECT USING (true);
CREATE POLICY "service_manage_frameworks" ON compliance_frameworks FOR ALL USING (true) WITH CHECK (true);

-- Framework controls (article/control level)
CREATE TABLE IF NOT EXISTS framework_controls (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    UUID    NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  control_code    TEXT    NOT NULL,   -- e.g. 'ART-13', 'CC6.1', 'MAP-1'
  title           TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  evidence_types  TEXT[]  NOT NULL DEFAULT '{}',
  UNIQUE (framework_id, control_code)
);

ALTER TABLE framework_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_controls" ON framework_controls FOR SELECT USING (true);
CREATE POLICY "service_manage_controls" ON framework_controls FOR ALL USING (true) WITH CHECK (true);

-- Per-tenant compliance evidence (maps audit events to controls)
CREATE TABLE IF NOT EXISTS control_evidence (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  control_id      UUID        NOT NULL REFERENCES framework_controls(id),
  audit_event_id  UUID        NULL,   -- references audit_events.id
  evidence_text   TEXT        NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.9,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, control_id, audit_event_id)
);

ALTER TABLE control_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_evidence"
  ON control_evidence FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_evidence"
  ON control_evidence FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_control_evidence_tenant ON control_evidence(tenant_id, control_id);
CREATE INDEX idx_framework_controls_fw ON framework_controls(framework_id);

-- ─── Seed: Regulatory Frameworks ─────────────────────────────────────────────
INSERT INTO compliance_frameworks (name, short_name, jurisdiction, version, description) VALUES
('EU Artificial Intelligence Act', 'EU AI Act', 'EU', '2024', 'Horizontal regulation for AI systems across the EU. High-risk systems require human oversight, transparency, and quality management.'),
('NIST AI Risk Management Framework', 'NIST RMF', 'US', '1.0', 'Voluntary framework for managing AI risks across Govern, Map, Measure, and Manage functions.'),
('SOC 2 Type II', 'SOC 2', 'US', '2022', 'Trust Services Criteria for security, availability, confidentiality, and privacy.')
ON CONFLICT (name) DO NOTHING;

-- ─── Seed: EU AI Act Controls ─────────────────────────────────────────────────
WITH fw AS (SELECT id FROM compliance_frameworks WHERE short_name = 'EU AI Act')
INSERT INTO framework_controls (framework_id, control_code, title, description, evidence_types)
SELECT fw.id, ctrl.code, ctrl.title, ctrl.desc, ctrl.ev FROM fw, (VALUES
  ('ART-13', 'Transparency', 'High-risk AI systems must be transparent and provide meaningful information about their logic.', ARRAY['provenance_certificate', 'decision_explanation']),
  ('ART-14', 'Human Oversight', 'Human oversight measures to prevent or minimise risks.', ARRAY['hitl_exception', 'audit_event']),
  ('ART-15', 'Accuracy & Robustness', 'High-risk AI systems must be accurate, robust, and cybersecure.', ARRAY['behavioral_anomaly', 'audit_event']),
  ('ART-17', 'Quality Management', 'Quality management system for high-risk AI.', ARRAY['audit_event', 'provenance_certificate']),
  ('ART-50', 'Transparency for General AI', 'Obligations for general-purpose AI transparency.', ARRAY['decision_explanation'])
) AS ctrl(code, title, desc, ev) ON CONFLICT (framework_id, control_code) DO NOTHING;

-- ─── Seed: NIST RMF Controls ─────────────────────────────────────────────────
WITH fw AS (SELECT id FROM compliance_frameworks WHERE short_name = 'NIST RMF')
INSERT INTO framework_controls (framework_id, control_code, title, description, evidence_types)
SELECT fw.id, ctrl.code, ctrl.title, ctrl.desc, ctrl.ev FROM fw, (VALUES
  ('GOVERN-1', 'AI Governance', 'Policies, processes, and practices for AI risk management.', ARRAY['audit_event', 'policy_enforcement']),
  ('MAP-1', 'AI Risk Identification', 'Categorize and contextualize AI risks.', ARRAY['firewall_evaluation', 'risk_score']),
  ('MAP-2', 'AI Inventory', 'Identify and document AI systems in use.', ARRAY['agent_registration']),
  ('MEASURE-1', 'AI Risk Analysis', 'Analyse and assess AI risks.', ARRAY['provenance_certificate', 'behavioral_anomaly']),
  ('MANAGE-1', 'AI Risk Response', 'Prioritize and implement risk responses.', ARRAY['hitl_exception', 'firewall_evaluation'])
) AS ctrl(code, title, desc, ev) ON CONFLICT (framework_id, control_code) DO NOTHING;

-- ─── Seed: SOC 2 Controls ────────────────────────────────────────────────────
WITH fw AS (SELECT id FROM compliance_frameworks WHERE short_name = 'SOC 2')
INSERT INTO framework_controls (framework_id, control_code, title, description, evidence_types)
SELECT fw.id, ctrl.code, ctrl.title, ctrl.desc, ctrl.ev FROM fw, (VALUES
  ('CC1.1', 'Control Environment', 'Management demonstrates commitment to integrity and ethical values.', ARRAY['audit_event', 'policy_enforcement']),
  ('CC5.1', 'Risk Assessment', 'Assess risk of achieving objectives.', ARRAY['risk_score', 'behavioral_anomaly']),
  ('CC6.1', 'Logical Access Controls', 'Restrict logical access to systems.', ARRAY['identity_check', 'audit_event']),
  ('CC7.1', 'System Monitoring', 'Monitor system components for anomalies.', ARRAY['behavioral_anomaly', 'audit_event']),
  ('CC9.1', 'Risk Mitigation', 'Identify and mitigate risks from vendors and partners.', ARRAY['firewall_evaluation', 'provenance_certificate'])
) AS ctrl(code, title, desc, ev) ON CONFLICT (framework_id, control_code) DO NOTHING;
