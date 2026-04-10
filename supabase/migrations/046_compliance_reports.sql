-- 046_compliance_reports.sql
-- EU AI Act Evidence Package Reports

CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'EU_AI_ACT_2024',
  generated_at TIMESTAMPTZ DEFAULT now(),
  framework_version TEXT NOT NULL DEFAULT 'EU_AI_ACT_AUG_2026',
  status TEXT NOT NULL DEFAULT 'generating', -- generating | ready | failed
  json_export JSONB,
  pdf_url TEXT,
  evidence_period_start TIMESTAMPTZ NOT NULL,
  evidence_period_end TIMESTAMPTZ NOT NULL,
  agent_count INTEGER DEFAULT 0,
  action_count INTEGER DEFAULT 0,
  hitl_reviews_count INTEGER DEFAULT 0,
  coverage_score NUMERIC(5,2) DEFAULT 0,
  article_coverage JSONB DEFAULT '{"art_13": false, "art_14": false, "art_17": false, "art_26": false}',
  created_by UUID,
  error_message TEXT,
  CONSTRAINT compliance_reports_status_check CHECK (status IN ('generating', 'ready', 'failed'))
);

-- Index for org queries
CREATE INDEX IF NOT EXISTS idx_compliance_reports_org_id ON compliance_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON compliance_reports(generated_at DESC);

-- Down migration:
-- DROP TABLE IF EXISTS compliance_reports;
-- DROP INDEX IF EXISTS idx_compliance_reports_org_id;
-- DROP INDEX IF EXISTS idx_compliance_reports_status;
-- DROP INDEX IF EXISTS idx_compliance_reports_generated_at;
