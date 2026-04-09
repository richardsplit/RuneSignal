-- ============================================================
-- Migration 043: Plugin System
-- Webhook/evaluator/reporter/connector plugin architecture.
-- Plugins fire non-blocking after every audit ledger write.
-- ============================================================

CREATE TABLE IF NOT EXISTS plugins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  plugin_type   TEXT        NOT NULL CHECK (plugin_type IN ('webhook', 'evaluator', 'reporter', 'connector')),
  -- Event types that trigger this plugin. Use '*' for all events.
  triggers      TEXT[]      NOT NULL DEFAULT '{}',
  endpoint_url  TEXT        NOT NULL,
  auth_header   TEXT        NULL,   -- e.g. 'Authorization: Bearer <token>'
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  retry_count   INTEGER     NOT NULL DEFAULT 3,
  timeout_ms    INTEGER     NOT NULL DEFAULT 5000,
  -- Execution stats
  last_fired_at TIMESTAMPTZ NULL,
  total_fires   INTEGER     NOT NULL DEFAULT 0,
  total_errors  INTEGER     NOT NULL DEFAULT 0,
  -- Plugin metadata
  icon          TEXT        NULL,   -- emoji or URL
  category      TEXT        NOT NULL DEFAULT 'custom'
    CHECK (category IN ('ticketing', 'observability', 'alerting', 'crm', 'regulatory', 'custom')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_manage_plugins"
  ON plugins FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Plugin execution log (last 1000 executions per tenant, pruned by cron)
CREATE TABLE IF NOT EXISTS plugin_executions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id     UUID        NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES tenants(id),
  event_type    TEXT        NOT NULL,
  audit_event_id UUID       NULL,
  status        TEXT        NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'skipped')),
  status_code   INTEGER     NULL,
  error_message TEXT        NULL,
  latency_ms    INTEGER     NULL,
  attempt       INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plugin_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_plugin_executions"
  ON plugin_executions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "service_insert_plugin_executions"
  ON plugin_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_plugins_stats"
  ON plugins FOR UPDATE USING (true);

CREATE INDEX idx_plugins_tenant ON plugins(tenant_id, is_active);
CREATE INDEX idx_plugin_executions_plugin ON plugin_executions(plugin_id, created_at DESC);
CREATE INDEX idx_plugin_executions_tenant ON plugin_executions(tenant_id, created_at DESC);
