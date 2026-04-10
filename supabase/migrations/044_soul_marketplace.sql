-- ============================================================
-- Migration 044: SOUL Template Marketplace
-- Pre-built Corporate SOUL configurations.
-- Stripe-gated: free templates activate instantly,
-- paid templates require checkout.session.completed.
-- ============================================================

CREATE TABLE IF NOT EXISTS soul_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL UNIQUE,
  description     TEXT        NOT NULL,
  industry        TEXT        NOT NULL,      -- 'Finance', 'Healthcare', 'Insurance', 'Technology', 'Government'
  jurisdiction    TEXT        NOT NULL,      -- 'EU/EEA', 'US', 'UK', 'Global'
  regulations     TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. ['PSD2', 'MiFID II', 'GDPR']
  soul_config     JSONB       NOT NULL DEFAULT '{}',  -- the actual SOUL object to install
  price_usd       NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_price_id TEXT        NULL,          -- Stripe price ID for paid templates
  icon            TEXT        NOT NULL DEFAULT '🏛️',
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  version         TEXT        NOT NULL DEFAULT '1.0',
  downloads       INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public catalog (no auth required to browse)
ALTER TABLE soul_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_soul_templates" ON soul_templates FOR SELECT USING (true);

-- Per-tenant activation history
CREATE TABLE IF NOT EXISTS soul_activations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id     UUID        NOT NULL REFERENCES soul_templates(id),
  activated_by    TEXT        NULL,           -- user email
  payment_status  TEXT        NOT NULL DEFAULT 'free'
    CHECK (payment_status IN ('free', 'paid', 'pending')),
  stripe_session_id TEXT      NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_id)
);

ALTER TABLE soul_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_activations"
  ON soul_activations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_manage_activations"
  ON soul_activations FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_soul_activations_tenant ON soul_activations(tenant_id, is_active);

-- ─── Seed: Official SOUL Templates ───────────────────────────────────────────
INSERT INTO soul_templates (name, description, industry, jurisdiction, regulations, price_usd, icon, soul_config) VALUES

('EU Financial Services SOUL',
 'Pre-configured Corporate SOUL for EU financial institutions. Enforces PSD2 strong authentication, MiFID II best execution, GDPR data minimisation, and human oversight for transactions over €10,000.',
 'Finance', 'EU/EEA', ARRAY['PSD2', 'MiFID II', 'GDPR', 'EBA Guidelines'],
 2000.00, '🏦',
 '{
   "values": ["regulatory_compliance", "customer_protection", "transparency", "auditability"],
   "prohibited_actions": ["process_payment_without_sca", "share_customer_data_without_consent", "execute_trade_without_best_execution_check"],
   "human_oversight_threshold": 10000,
   "human_oversight_currency": "EUR",
   "require_dual_approval_above": 50000,
   "data_residency": ["EU", "EEA"],
   "max_autonomous_transaction_eur": 10000,
   "audit_all_transactions": true,
   "jurisdiction": "EU"
 }'),

('US Healthcare AI SOUL',
 'HIPAA and FDA 21 CFR Part 11-compliant SOUL for healthcare AI agents. Enforces minimum necessary access, PHI handling rules, audit trails for all clinical decisions, and human review for diagnoses.',
 'Healthcare', 'US', ARRAY['HIPAA', 'FDA 21 CFR Part 11', 'HITECH', 'ONC'],
 2500.00, '🏥',
 '{
   "values": ["patient_safety", "privacy", "clinical_accuracy", "do_no_harm"],
   "prohibited_actions": ["share_phi_without_authorization", "make_autonomous_diagnosis", "modify_clinical_records_without_audit"],
   "human_oversight_required_for": ["diagnosis", "treatment_recommendation", "prescription"],
   "require_dual_approval_above": 0,
   "data_residency": ["US"],
   "audit_all_phi_access": true,
   "minimum_necessary_rule": true,
   "jurisdiction": "US"
 }'),

('UK Insurance SOUL',
 'FCA and Lloyd''s Market Association-compliant SOUL for UK insurance AI agents. Enforces treating customers fairly (TCF), fraud screening obligations, and ICO data protection requirements.',
 'Insurance', 'UK', ARRAY['FCA', 'Lloyd''s Market Association', 'ICO', 'Insurance Act 2015'],
 2000.00, '🛡️',
 '{
   "values": ["treating_customers_fairly", "fraud_prevention", "regulatory_compliance", "transparency"],
   "prohibited_actions": ["deny_claim_without_investigation", "share_policyholder_data_externally", "process_claim_above_threshold_without_review"],
   "human_oversight_threshold": 50000,
   "human_oversight_currency": "GBP",
   "fraud_score_escalation_threshold": 0.7,
   "data_residency": ["UK"],
   "tcf_outcomes_required": true,
   "jurisdiction": "UK"
 }'),

('Global Technology Startup SOUL',
 'Sensible defaults for technology startups. Enforces basic ethical AI principles, prevents data exfiltration, and requires human review for irreversible actions. Free to activate.',
 'Technology', 'Global', ARRAY['SOC 2 basics', 'GDPR lite'],
 0.00, '🚀',
 '{
   "values": ["move_fast_responsibly", "user_privacy", "transparency", "reversibility"],
   "prohibited_actions": ["exfiltrate_user_data", "delete_production_data_without_backup", "disable_security_controls"],
   "human_oversight_required_for": ["irreversible_actions", "mass_data_operations"],
   "require_dual_approval_above": 100000,
   "data_residency": ["global"],
   "audit_irreversible_actions": true,
   "jurisdiction": "Global"
 }'),

('US Federal / FedRAMP SOUL',
 'FISMA and NIST SP 800-53 compliant SOUL for federal government AI deployments. Enforces least privilege, continuous monitoring, incident response obligations, and zero-trust principles.',
 'Government', 'US', ARRAY['FISMA', 'NIST SP 800-53', 'FedRAMP', 'EO 14028'],
 5000.00, '🏛️',
 '{
   "values": ["national_security", "least_privilege", "continuous_monitoring", "zero_trust"],
   "prohibited_actions": ["access_classified_without_clearance", "transmit_cui_unencrypted", "bypass_continuous_monitoring", "disable_logging"],
   "human_oversight_required_for": ["all_privileged_actions", "data_exfil_requests", "cross_boundary_data_transfer"],
   "require_dual_approval_above": 0,
   "data_residency": ["US"],
   "fedramp_controls_enforced": true,
   "incident_response_sla_minutes": 60,
   "jurisdiction": "US-Federal"
 }')

ON CONFLICT (name) DO NOTHING;
