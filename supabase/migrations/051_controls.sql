-- Phase 4 Task 4.1.1: Controls + Control Evaluations
-- EU AI Act Articles 9, 13, 14, 15, 26 — Continuous compliance monitoring
-- ISO 42001 Clause 8.2 — Operational planning and control

CREATE TABLE controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,

  -- Binding
  regulation TEXT,                             -- 'eu_ai_act', 'iso_42001', null for custom
  clause_ref TEXT,                             -- 'article_14', 'clause_8.2', etc.
  policy_id UUID,                              -- Optional link to arbiter_policies

  -- Evaluation
  evaluation_type TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (evaluation_type IN ('real_time', 'scheduled', 'manual')),
  evaluation_query JSONB,
  evaluation_schedule TEXT,                    -- Cron expression for scheduled

  -- State
  status TEXT NOT NULL DEFAULT 'not_evaluated'
    CHECK (status IN ('passing', 'failing', 'warning', 'not_evaluated')),
  last_evaluated_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,

  -- Metadata
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE control_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'warning', 'error')),
  detail JSONB DEFAULT '{}',
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_controls_tenant ON controls(tenant_id, status);
CREATE INDEX idx_control_evaluations_control ON control_evaluations(control_id, evaluated_at DESC);
