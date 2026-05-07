-- ============================================================
-- Cost Intelligence Platform — Phase 1 Core Schema
-- ============================================================

-- Tenants ----------------------------------------------------------
create table if not exists ci_tenants (
  id                          uuid primary key default gen_random_uuid(),
  email                       text not null unique,
  api_key_hash                text not null unique,           -- bcrypt hash
  stripe_customer_id          text,
  tier                        text not null default 'trial'   -- trial | starter | growth | scale
                                check (tier in ('trial','starter','growth','scale')),
  trial_ends_at               timestamptz not null default now() + interval '30 days',
  openai_api_key_enc          text,                           -- AES-256 encrypted
  anthropic_api_key_enc       text,
  gemini_api_key_enc          text,
  stripe_connect_id           text,
  first_log_received_at       timestamptz,
  onboarding_completed_at     timestamptz,
  created_at                  timestamptz not null default now()
);

create index if not exists ci_tenants_api_key_hash_idx on ci_tenants (api_key_hash);
create index if not exists ci_tenants_stripe_customer_id_idx on ci_tenants (stripe_customer_id);

-- Customer ID mappings (Stripe ↔ internal) -------------------------
create table if not exists ci_customer_id_mappings (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references ci_tenants(id) on delete cascade,
  stripe_customer_id          text not null,
  internal_customer_id        text not null,
  display_name                text,
  created_at                  timestamptz not null default now(),
  unique (tenant_id, stripe_customer_id),
  unique (tenant_id, internal_customer_id)
);

create index if not exists ci_cid_mappings_tenant_idx on ci_customer_id_mappings (tenant_id);
create index if not exists ci_cid_mappings_stripe_idx  on ci_customer_id_mappings (tenant_id, stripe_customer_id);

-- Inference logs ---------------------------------------------------
create table if not exists ci_inference_logs (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references ci_tenants(id) on delete cascade,
  customer_id                 text,                           -- internal_customer_id
  feature_tag                 text,
  endpoint_id                 text,
  model                       text not null,
  provider                    text not null default 'openai'
                                check (provider in ('openai','anthropic','gemini','other')),
  input_tokens                integer not null default 0,
  output_tokens               integer not null default 0,
  cached_tokens               integer not null default 0,
  reasoning_tokens            integer not null default 0,
  cost_usd                    numeric(12,8) not null default 0,
  latency_ms                  integer,
  session_id                  text,
  request_id                  text,
  metadata                    jsonb,
  created_at                  timestamptz not null default now()
);

create index if not exists ci_logs_tenant_created_idx  on ci_inference_logs (tenant_id, created_at desc);
create index if not exists ci_logs_customer_idx        on ci_inference_logs (tenant_id, customer_id, created_at desc);
create index if not exists ci_logs_feature_idx         on ci_inference_logs (tenant_id, feature_tag, created_at desc);
create index if not exists ci_logs_endpoint_idx        on ci_inference_logs (tenant_id, endpoint_id, created_at desc);
create index if not exists ci_logs_model_idx           on ci_inference_logs (tenant_id, model);
create index if not exists ci_logs_request_id_idx      on ci_inference_logs (tenant_id, request_id) where request_id is not null;

-- Partition hint: add monthly range partitions in production
-- alter table ci_inference_logs partition by range (created_at);

-- Revenue events (from Stripe webhooks) ----------------------------
create table if not exists ci_revenue_events (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references ci_tenants(id) on delete cascade,
  customer_id                 text,                           -- internal_customer_id (resolved)
  stripe_customer_id          text,
  stripe_event_id             text not null,                 -- idempotency key
  event_type                  text not null,
  amount_usd                  numeric(12,4) not null,
  plan_tier                   text,
  period_start                timestamptz,
  period_end                  timestamptz,
  metadata                    jsonb,
  created_at                  timestamptz not null default now(),
  unique (tenant_id, stripe_event_id)
);

create index if not exists ci_rev_tenant_created_idx   on ci_revenue_events (tenant_id, created_at desc);
create index if not exists ci_rev_customer_idx         on ci_revenue_events (tenant_id, customer_id, created_at desc);
create index if not exists ci_rev_stripe_customer_idx  on ci_revenue_events (tenant_id, stripe_customer_id);

-- Background job queue (for 24h first-dangerous-customer email) ----
create table if not exists ci_job_queue (
  id                          uuid primary key default gen_random_uuid(),
  job_type                    text not null,
  payload                     jsonb not null,
  status                      text not null default 'pending'
                                check (status in ('pending','running','done','failed')),
  attempts                    integer not null default 0,
  run_at                      timestamptz not null default now(),
  completed_at                timestamptz,
  error                       text,
  created_at                  timestamptz not null default now()
);

create index if not exists ci_job_queue_status_run_at_idx on ci_job_queue (status, run_at)
  where status = 'pending';

-- RLS (enable, but allow service-role bypass) ----------------------
alter table ci_tenants              enable row level security;
alter table ci_customer_id_mappings enable row level security;
alter table ci_inference_logs       enable row level security;
alter table ci_revenue_events       enable row level security;
alter table ci_job_queue            enable row level security;

-- Service role bypasses all policies (used by the FastAPI backend)
