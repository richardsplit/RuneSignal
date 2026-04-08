-- ============================================================
-- Migration 033: Premium Policy Packs
-- Pre-built regulatory policy bundles (HIPAA, SOX, GDPR, PCI-DSS).
-- Tenants can install packs to immediately enforce regulatory rules.
-- ============================================================

CREATE TABLE IF NOT EXISTS policy_packs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  description   TEXT        NOT NULL,
  category      TEXT        NOT NULL CHECK (category IN ('healthcare', 'financial', 'privacy', 'payment', 'security')),
  policies      JSONB       NOT NULL DEFAULT '[]',  -- Array of policy rule objects
  tier_required TEXT        NOT NULL DEFAULT 'pro' CHECK (tier_required IN ('starter', 'pro', 'enterprise')),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  version       TEXT        NOT NULL DEFAULT '1.0',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table: which packs are installed per tenant
CREATE TABLE IF NOT EXISTS tenant_policy_packs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pack_id       UUID        NOT NULL REFERENCES policy_packs(id) ON DELETE CASCADE,
  installed_by  TEXT        NULL,
  installed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  UNIQUE (tenant_id, pack_id)
);

-- Row Level Security
ALTER TABLE tenant_policy_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_policy_packs"
  ON tenant_policy_packs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_write_policy_packs"
  ON tenant_policy_packs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- policy_packs is public read (no RLS needed — it's a catalog)
ALTER TABLE policy_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_policy_packs"
  ON policy_packs FOR SELECT USING (true);

-- ─── Seed Data: Pre-built regulatory packs ───────────────────────────────────
INSERT INTO policy_packs (name, description, category, tier_required, policies, version) VALUES

('HIPAA Compliance Pack',
 'Enforces HIPAA-compliant agent behaviour: PHI access controls, minimum necessary rule, audit requirements.',
 'healthcare', 'pro',
 '[
   {"name": "No bulk PHI export", "description": "Agent must not export more than 100 PHI records in a single action", "domain": "compliance"},
   {"name": "PHI access requires justification", "description": "Access to PHI fields requires documented clinical justification", "domain": "compliance"},
   {"name": "No PHI to external systems", "description": "PHI must not be sent to external endpoints without DPO approval", "domain": "compliance"},
   {"name": "Audit all PHI access", "description": "Every PHI access event must be logged in the tamper-evident audit ledger", "domain": "security"}
 ]',
 '1.0'),

('SOX Financial Controls Pack',
 'Implements SOX Section 302/404 controls for AI agents performing financial operations.',
 'financial', 'pro',
 '[
   {"name": "Segregation of duties", "description": "Agent cannot both approve and execute financial transactions", "domain": "finance"},
   {"name": "Journal entry limit", "description": "Journal entries over $50,000 require CFO approval", "domain": "finance"},
   {"name": "No retroactive entries", "description": "Agent cannot create backdated journal entries", "domain": "finance"},
   {"name": "Audit trail mandatory", "description": "All financial actions require Ed25519-signed provenance certificate", "domain": "finance"}
 ]',
 '1.0'),

('GDPR Data Protection Pack',
 'Enforces GDPR-compliant AI agent behaviour: purpose limitation, data minimisation, right to erasure.',
 'privacy', 'starter',
 '[
   {"name": "Purpose limitation", "description": "Agent must not use personal data for purposes beyond original collection intent", "domain": "compliance"},
   {"name": "Data minimisation", "description": "Agent must not collect more personal data than necessary for the task", "domain": "compliance"},
   {"name": "Right to erasure requires DPO", "description": "Data deletion actions require DPO approval before execution", "domain": "compliance"},
   {"name": "No cross-border transfer without consent", "description": "Personal data must not be transferred outside approved regions", "domain": "compliance"}
 ]',
 '1.0'),

('PCI-DSS Payment Security Pack',
 'Enforces PCI-DSS requirements for AI agents handling cardholder data.',
 'payment', 'enterprise',
 '[
   {"name": "No CHD storage", "description": "Agent must not store full cardholder data (PAN, CVV) in any system", "domain": "security"},
   {"name": "Mask PAN in logs", "description": "Primary Account Numbers must be masked in all audit logs", "domain": "security"},
   {"name": "Encrypt CHD in transit", "description": "Cardholder data must only be transmitted over encrypted channels", "domain": "security"},
   {"name": "Two-person rule for CHD access", "description": "Access to cardholder data requires two-person authorisation", "domain": "security"}
 ]',
 '1.0')

ON CONFLICT (name) DO NOTHING;
