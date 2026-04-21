-- Evidence Packs: insurance- and regulator-grade signed decision artefacts
-- Enables Product 1 from the Agent Evidence Plane: RuneSignal Evidence Pack™

CREATE TABLE evidence_packs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        text        NOT NULL,
  pack_name        text        NOT NULL,
  regulation       text        NOT NULL,  -- 'eu_ai_act' | 'iso_42001' | 'nist_ai_rmf' | 'soc2' | 'hipaa' | 'insurance'
  pack_type        text        NOT NULL DEFAULT 'regulator',  -- 'regulator' | 'insurance' | 'internal'
  status           text        NOT NULL DEFAULT 'generating', -- 'generating' | 'ready' | 'failed'
  coverage_score   numeric,
  clauses_covered  int,
  clauses_total    int,
  agent_ids        text[]      NOT NULL DEFAULT '{}',
  date_from        timestamptz,
  date_to          timestamptz,
  manifest_hash    text,
  signature        text,
  signed_at        timestamptz,
  signer_key_id    text,
  evidence_manifest jsonb      NOT NULL DEFAULT '{}',
  gaps             jsonb       NOT NULL DEFAULT '[]',
  template_id      text,
  notified_body    text,       -- 'TÜV' | 'DNV' | 'BSI' | null
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX evidence_packs_tenant_idx     ON evidence_packs(tenant_id);
CREATE INDEX evidence_packs_regulation_idx ON evidence_packs(tenant_id, regulation);
CREATE INDEX evidence_packs_status_idx     ON evidence_packs(tenant_id, status);
CREATE INDEX evidence_packs_created_idx    ON evidence_packs(tenant_id, created_at DESC);

ALTER TABLE evidence_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON evidence_packs
  USING (tenant_id = current_setting('app.tenant_id', true));

-- Evidence pack templates (pre-defined regulator + insurance templates)
CREATE TABLE evidence_pack_templates (
  id               text        PRIMARY KEY,
  name             text        NOT NULL,
  description      text,
  regulation       text        NOT NULL,
  pack_type        text        NOT NULL DEFAULT 'regulator',
  framework_clauses jsonb      NOT NULL DEFAULT '[]',
  is_active        bool        NOT NULL DEFAULT true,
  notified_body    text,
  version          text        NOT NULL DEFAULT '1.0',
  created_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO evidence_pack_templates (id, name, description, regulation, pack_type, notified_body, framework_clauses) VALUES
(
  'eu_ai_act_annex_iv',
  'EU AI Act — Annex IV Technical Documentation',
  'Mandatory technical documentation for high-risk AI systems under EU AI Act 2024/1689. Covers transparency, human oversight, quality management, and deployer obligations. Deadline: 2 August 2026.',
  'eu_ai_act', 'regulator', 'TÜV',
  '["Art.13 Transparency","Art.14 Human Oversight","Art.17 Quality Management","Art.29 Deployer Obligations"]'
),
(
  'iso_42001_full',
  'ISO 42001 — AI Management System',
  'Complete AI management system evidence pack per ISO/IEC 42001:2023. Covers risk management, oversight logs, incident reporting, and performance monitoring.',
  'iso_42001', 'regulator', null,
  '["6.1 Risk Management","7.5 Technical Documentation","8.4 Oversight Logs","9.1 Performance Monitoring","10.2 Incident Reporting"]'
),
(
  'nist_ai_rmf_1',
  'NIST AI RMF 1.0 — Govern / Map / Measure / Manage',
  'US NIST AI Risk Management Framework evidence pack covering all four core functions.',
  'nist_ai_rmf', 'regulator', null,
  '["GOVERN","MAP","MEASURE","MANAGE"]'
),
(
  'munich_re_insurance',
  'Munich Re — AI Liability Evidence Pack',
  'Insurance carrier-ready evidence pack for AI-liability policy underwriting. Includes loss-event vs no-loss-event sampling per Munich Re template.',
  'insurance', 'insurance', null,
  '["Incident Sampling","Decision Coverage","Anomaly Rate","HITL Coverage","Reversal History"]'
);
