-- Decision Outcomes: outcome back-labeling for the Decision Ledger
-- Accepts webhook callbacks from downstream systems (Jira, ServiceNow, insurance claims)
-- Enables Product 3: Decision Ledger + Reversibility Engine

CREATE TABLE decision_outcomes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  decision_id     text        NOT NULL,  -- audit_events.request_id or any decision ref
  decision_type   text,                  -- 'agent_action' | 'hitl_approval' | 'firewall_verdict'
  outcome_status  text        NOT NULL,  -- 'accepted' | 'rejected' | 'reversed' | 'litigated' | 'settled' | 'pending'
  outcome_source  text,                  -- 'manual' | 'jira' | 'servicenow' | 'insurance_claim' | 'litigation' | 'webhook'
  source_ref      text,                  -- external ticket / claim ID
  source_url      text,
  reversal_id     uuid,
  label_notes     text,
  labeled_by      text,
  labeled_at      timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX decision_outcomes_tenant_idx    ON decision_outcomes(tenant_id);
CREATE INDEX decision_outcomes_decision_idx  ON decision_outcomes(tenant_id, decision_id);
CREATE INDEX decision_outcomes_status_idx    ON decision_outcomes(tenant_id, outcome_status);
CREATE INDEX decision_outcomes_created_idx   ON decision_outcomes(tenant_id, created_at DESC);

ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON decision_outcomes
  USING (tenant_id = current_setting('app.tenant_id', true));

-- Decision Reversals: reversal orchestration actions
CREATE TABLE decision_reversals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  decision_id     text        NOT NULL,
  reversal_type   text        NOT NULL,  -- 'refund' | 'revoke_access' | 'rollback_deploy' | 'retract_filing' | 'custom'
  status          text        NOT NULL DEFAULT 'pending',  -- 'pending' | 'executing' | 'completed' | 'failed'
  initiated_by    text,
  reason          text,
  actions         jsonb       NOT NULL DEFAULT '[]',
  completed_at    timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX decision_reversals_tenant_idx   ON decision_reversals(tenant_id);
CREATE INDEX decision_reversals_decision_idx ON decision_reversals(tenant_id, decision_id);
CREATE INDEX decision_reversals_status_idx   ON decision_reversals(tenant_id, status);

ALTER TABLE decision_reversals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON decision_reversals
  USING (tenant_id = current_setting('app.tenant_id', true));
