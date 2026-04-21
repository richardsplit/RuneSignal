-- Agent Passports: cross-org signed identity + capability attestation registry
-- Enables Product 2: Agent Passport Registry (network-effect trust layer)

CREATE TABLE agent_passports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           text        NOT NULL,
  agent_id            text        NOT NULL,
  passport_number     text        UNIQUE NOT NULL,  -- 'RS-XXXX-XXXX-XXXX' format
  status              text        NOT NULL DEFAULT 'active',  -- 'active' | 'suspended' | 'revoked'
  agent_name          text        NOT NULL,
  agent_type          text,
  framework           text        DEFAULT 'runesignal',  -- 'spiffe' | 'w3c_vc' | 'runesignal'
  capabilities        jsonb       NOT NULL DEFAULT '[]',
  risk_tier           text        NOT NULL DEFAULT 'unclassified',
  eu_ai_act_category  text,
  reputation_score    numeric     NOT NULL DEFAULT 100.0,
  incident_count      int         NOT NULL DEFAULT 0,
  anomaly_count       int         NOT NULL DEFAULT 0,
  hitl_count          int         NOT NULL DEFAULT 0,
  signature           text,
  signed_at           timestamptz,
  valid_from          timestamptz NOT NULL DEFAULT now(),
  valid_to            timestamptz,
  revoked_at          timestamptz,
  revocation_reason   text,
  public              bool        NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_passports_agent_tenant_idx ON agent_passports(agent_id, tenant_id);
CREATE INDEX agent_passports_tenant_idx    ON agent_passports(tenant_id);
CREATE INDEX agent_passports_status_idx    ON agent_passports(tenant_id, status);
CREATE INDEX agent_passports_public_idx    ON agent_passports(public) WHERE public = true;
CREATE INDEX agent_passports_number_idx    ON agent_passports(passport_number);

ALTER TABLE agent_passports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON agent_passports
  USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY "public_read" ON agent_passports
  FOR SELECT USING (public = true);

-- Passport verifications: audit trail of counterparty verification calls (metered)
CREATE TABLE passport_verifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id     uuid        NOT NULL REFERENCES agent_passports(id) ON DELETE CASCADE,
  verifier_tenant text        NOT NULL,
  verified_at     timestamptz NOT NULL DEFAULT now(),
  result          text        NOT NULL DEFAULT 'valid',  -- 'valid' | 'revoked' | 'expired' | 'not_found'
  metadata        jsonb       NOT NULL DEFAULT '{}'
);

CREATE INDEX passport_verifications_passport_idx  ON passport_verifications(passport_id);
CREATE INDEX passport_verifications_verifier_idx  ON passport_verifications(verifier_tenant);
CREATE INDEX passport_verifications_verified_idx  ON passport_verifications(verified_at DESC);

ALTER TABLE passport_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifier_isolation" ON passport_verifications
  USING (verifier_tenant = current_setting('app.tenant_id', true));
