CREATE TABLE regulation_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation TEXT NOT NULL,            -- 'eu_ai_act', 'iso_42001'
  clause_ref TEXT NOT NULL,            -- 'article_13', 'clause_6.1', etc.
  clause_title TEXT NOT NULL,          -- 'Transparency obligations'
  clause_description TEXT,
  evidence_sources JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{"module":"s3","table":"audit_events","event_type":"provenance.*"},
  --        {"module":"s7","table":"hitl_exceptions"}]
  required_for_coverage BOOLEAN DEFAULT true,
  UNIQUE(regulation, clause_ref)
);

-- Seed EU AI Act articles
INSERT INTO regulation_clauses (regulation, clause_ref, clause_title, evidence_sources) VALUES
  ('eu_ai_act', 'article_9',  'Risk Management System',          '[{"module":"s14","table":"anomaly_events"},{"module":"s1","table":"arbiter_policies"}]'),
  ('eu_ai_act', 'article_10', 'Data and Data Governance',        '[{"module":"s3","table":"audit_events","filter":"event_type LIKE ''provenance.%''"}]'),
  ('eu_ai_act', 'article_11', 'Technical Documentation',         '[{"module":"s3","table":"audit_events"}]'),
  ('eu_ai_act', 'article_12', 'Record-Keeping',                  '[{"module":"s3","table":"audit_events"},{"module":"firewall","table":"firewall_evaluations"}]'),
  ('eu_ai_act', 'article_13', 'Transparency',                    '[{"module":"s3","table":"audit_events","filter":"signature IS NOT NULL"},{"module":"s11","table":"certificate_explanations"}]'),
  ('eu_ai_act', 'article_14', 'Human Oversight',                 '[{"module":"s7","table":"hitl_exceptions"}]'),
  ('eu_ai_act', 'article_15', 'Accuracy, Robustness, Security',  '[{"module":"s14","table":"anomaly_events"},{"module":"firewall","table":"firewall_evaluations"}]'),
  ('eu_ai_act', 'article_17', 'Quality Management System',       '[{"module":"s1","table":"arbiter_policies"},{"module":"s14","table":"anomaly_events"}]'),
  ('eu_ai_act', 'article_26', 'Obligations of Deployers',        '[{"module":"s6","table":"agent_credentials"},{"module":"s6","table":"agent_inventory"}]'),
  ('eu_ai_act', 'article_73', 'Reporting of Serious Incidents',  '[]');

-- Seed ISO 42001 clauses
INSERT INTO regulation_clauses (regulation, clause_ref, clause_title, evidence_sources) VALUES
  ('iso_42001', 'clause_6.1', 'Actions to Address Risks',        '[{"module":"s14","table":"anomaly_events"},{"module":"s1","table":"arbiter_policies"}]'),
  ('iso_42001', 'clause_8.2', 'AI Risk Assessment',              '[{"module":"s14","table":"anomaly_events"},{"module":"firewall","table":"firewall_evaluations"}]'),
  ('iso_42001', 'clause_8.5', 'AI System Documentation',         '[{"module":"s3","table":"audit_events"},{"module":"s6","table":"agent_credentials"}]'),
  ('iso_42001', 'clause_9.1', 'Monitoring and Measurement',      '[{"module":"s7","table":"hitl_exceptions"},{"module":"s14","table":"anomaly_events"}]'),
  ('iso_42001', 'clause_10.2','Nonconformity and Corrective Action','[{"module":"s14","table":"anomaly_events","filter":"resolved_at IS NOT NULL"}]');
