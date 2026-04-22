-- Metered usage tracking for Evidence Pack, Decision Ledger, and Registry billing
-- Usage is recorded here on every billable action, then synced to Stripe

CREATE TABLE metered_usage (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             text        NOT NULL,
  meter_event           text        NOT NULL,  -- 'evidence_pack_signed' | 'ledger_replay' | 'registry_verification' | 'passport_issued'
  quantity              int         NOT NULL DEFAULT 1,
  unit_price_eur        numeric,               -- price at time of event (informational)
  resource_id           text,                  -- e.g. pack ID, decision ID, passport ID
  resource_type         text,                  -- 'evidence_pack' | 'decision' | 'passport'
  stripe_usage_record_id text,                 -- set after Stripe sync
  stripe_synced_at      timestamptz,
  idempotency_key       text        UNIQUE,    -- prevents double-billing on retry
  metadata              jsonb       NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX metered_usage_tenant_idx      ON metered_usage(tenant_id);
CREATE INDEX metered_usage_event_idx       ON metered_usage(tenant_id, meter_event);
CREATE INDEX metered_usage_created_idx     ON metered_usage(tenant_id, created_at DESC);
CREATE INDEX metered_usage_unsynced_idx    ON metered_usage(stripe_synced_at) WHERE stripe_synced_at IS NULL;

ALTER TABLE metered_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON metered_usage
  USING (tenant_id = current_setting('app.tenant_id', true));

-- Metered price catalog (maps events to Stripe price IDs from env, stored for reference)
CREATE TABLE metered_price_catalog (
  meter_event   text    PRIMARY KEY,
  display_name  text    NOT NULL,
  unit          text    NOT NULL DEFAULT 'pack',   -- 'pack' | 'query' | 'verification'
  min_price_eur numeric NOT NULL,
  max_price_eur numeric NOT NULL,
  tier_breaks   jsonb   NOT NULL DEFAULT '[]',     -- [{quantity, price_eur}]
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO metered_price_catalog (meter_event, display_name, unit, min_price_eur, max_price_eur, tier_breaks) VALUES
('evidence_pack_signed',   'Evidence Pack — Signed',        'pack',         0.05, 0.50, '[{"qty":100,"price":0.50},{"qty":1000,"price":0.20},{"qty":10000,"price":0.10},{"qty":100000,"price":0.05}]'),
('ledger_replay',          'Decision Ledger — Forensic Replay', 'query',    0.10, 1.00, '[{"qty":100,"price":1.00},{"qty":1000,"price":0.50},{"qty":10000,"price":0.20},{"qty":100000,"price":0.10}]'),
('registry_verification',  'Agent Registry — Verification', 'verification', 0.02, 0.20, '[{"qty":1000,"price":0.20},{"qty":10000,"price":0.10},{"qty":100000,"price":0.05},{"qty":1000000,"price":0.02}]'),
('passport_issued',        'Agent Passport — Issuance',     'passport',     1.00, 5.00, '[{"qty":10,"price":5.00},{"qty":100,"price":3.00},{"qty":1000,"price":1.00}]');
