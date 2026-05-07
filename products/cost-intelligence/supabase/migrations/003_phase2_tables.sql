-- ============================================================
-- Cost Intelligence Platform — Phase 2 Tables
-- ============================================================

-- Anomaly alerts ---------------------------------------------------
create table if not exists ci_anomaly_alerts (
  id                            uuid primary key default gen_random_uuid(),
  tenant_id                     uuid not null references ci_tenants(id) on delete cascade,
  endpoint_id                   text not null,
  z_score                       numeric(8,2) not null,
  current_cost_usd              numeric(12,8) not null,
  baseline_mean_usd             numeric(12,8) not null,
  baseline_stddev_usd           numeric(12,8) not null,
  severity                      text not null default 'medium'
                                  check (severity in ('low','medium','high','critical')),
  estimated_monthly_overrun_usd numeric(12,2),
  status                        text not null default 'active'
                                  check (status in ('active','resolved','muted')),
  resolved_at                   timestamptz,
  created_at                    timestamptz not null default now()
);

create index if not exists ci_anomaly_tenant_status_idx
  on ci_anomaly_alerts (tenant_id, status, created_at desc);
create index if not exists ci_anomaly_endpoint_recent_idx
  on ci_anomaly_alerts (tenant_id, endpoint_id, created_at desc);

alter table ci_anomaly_alerts enable row level security;

-- Budget policies --------------------------------------------------
create table if not exists ci_budget_policies (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references ci_tenants(id) on delete cascade,
  scope_type            text not null default 'global'
                          check (scope_type in ('global','customer','endpoint')),
  scope_value           text not null default '',      -- empty string = applies to all
  daily_limit_usd       numeric(12,4),
  monthly_limit_usd     numeric(12,4),
  soft_action           text not null default 'downgrade_model'
                          check (soft_action in ('allow','downgrade_model','terminate')),
  hard_action           text not null default 'terminate'
                          check (hard_action in ('allow','downgrade_model','terminate')),
  fallback_model        text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists ci_budget_policies_tenant_idx
  on ci_budget_policies (tenant_id, is_active);
create index if not exists ci_budget_policies_scope_idx
  on ci_budget_policies (tenant_id, scope_type, scope_value)
  where is_active = true;

alter table ci_budget_policies enable row level security;

-- Proxy request log ------------------------------------------------
-- Lightweight tracking of proxied calls (separate from inference_logs for scale)
create table if not exists ci_proxy_requests (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references ci_tenants(id) on delete cascade,
  customer_id           text,
  endpoint_id           text,
  model_requested       text,
  model_used            text,           -- may differ after downgrade
  policy_action         text,           -- allow | downgrade_model | terminate
  policy_id             uuid,
  blocked               boolean not null default false,
  latency_ms            integer,
  created_at            timestamptz not null default now()
);

create index if not exists ci_proxy_tenant_created_idx
  on ci_proxy_requests (tenant_id, created_at desc);

alter table ci_proxy_requests enable row level security;

-- Upsell events (for auto-upgrade nudge) ---------------------------
create table if not exists ci_upsell_events (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references ci_tenants(id) on delete cascade,
  trigger_type          text not null,  -- budget_80pct | anomaly_spike | margin_negative
  payload               jsonb not null,
  email_sent            boolean not null default false,
  email_sent_at         timestamptz,
  created_at            timestamptz not null default now()
);

alter table ci_upsell_events enable row level security;

-- Trigger: update updated_at on budget_policies
create or replace function ci_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ci_budget_policies_updated_at on ci_budget_policies;
create trigger ci_budget_policies_updated_at
  before update on ci_budget_policies
  for each row execute function ci_set_updated_at();
