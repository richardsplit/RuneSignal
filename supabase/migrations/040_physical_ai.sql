-- ============================================================
-- Migration 040: S15 Physical AI & Robotics Governance
-- Device registry and immutable physical action log.
-- physical_action_log: no UPDATE/DELETE (tamper-evident).
-- ============================================================

-- Physical agent device registry
CREATE TABLE IF NOT EXISTS physical_agents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id       TEXT        NOT NULL,   -- manufacturer/vendor device identifier
  device_type     TEXT        NOT NULL CHECK (device_type IN (
    'robotic_arm', 'forklift', 'drone', 'surgical_system', 'vehicle', 'conveyor', 'other'
  )),
  name            TEXT        NOT NULL,
  location_zone   TEXT        NULL,       -- e.g. 'warehouse-A', 'operating-room-3'
  current_lat     NUMERIC(10,7) NULL,
  current_lon     NUMERIC(10,7) NULL,
  status          TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'emergency_stopped', 'maintenance', 'decommissioned')),
  max_payload_kg  NUMERIC(8,2) NULL,
  allowed_zones   TEXT[]      NOT NULL DEFAULT '{}',
  firmware_version TEXT       NULL,
  last_heartbeat  TIMESTAMPTZ NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, device_id)
);

ALTER TABLE physical_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_manage_physical_agents"
  ON physical_agents FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Immutable physical action log (Ed25519-signed records)
CREATE TABLE IF NOT EXISTS physical_action_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  physical_agent_id UUID      NOT NULL REFERENCES physical_agents(id),
  action_type     TEXT        NOT NULL,   -- e.g. 'move', 'lift', 'cut', 'spray'
  action_detail   JSONB       NOT NULL DEFAULT '{}',
  zone            TEXT        NULL,
  verdict         TEXT        NOT NULL CHECK (verdict IN ('authorized', 'blocked', 'emergency_stopped')),
  hitl_ticket_id  UUID        NULL REFERENCES hitl_exceptions(id),
  signature       TEXT        NOT NULL,   -- Ed25519 over (id|action_type|action_detail|ts)
  operator_present BOOLEAN    NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE physical_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_physical_log"
  ON physical_action_log FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_physical_log"
  ON physical_action_log FOR INSERT WITH CHECK (true);

CREATE INDEX idx_physical_log_tenant ON physical_action_log(tenant_id, created_at DESC);
CREATE INDEX idx_physical_log_agent ON physical_action_log(physical_agent_id, created_at DESC);
CREATE INDEX idx_physical_agents_tenant ON physical_agents(tenant_id, status);
