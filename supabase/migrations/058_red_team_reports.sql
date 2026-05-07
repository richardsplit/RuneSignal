-- Migration 058: Red Team Reports (Phase 8 — S17)
-- POST /api/v1/redteam/run stores signed probe results here.
-- Gated by FEATURE_RED_TEAMING=true env flag.

create table if not exists red_team_reports (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  agent_id        text not null,
  test_suite      text not null default 'standard',
  status          text not null default 'pending'
                    check (status in ('pending','running','completed','failed')),
  total_probes    integer not null default 0,
  passed          integer not null default 0,
  failed          integer not null default 0,
  critical_count  integer not null default 0,
  high_count      integer not null default 0,
  medium_count    integer not null default 0,
  low_count       integer not null default 0,
  cvss_ai_score   numeric(4,1) not null default 0,
  probe_results   jsonb not null default '[]',
  manifest_hash   text,
  signature       text,
  signed_at       timestamptz,
  signer_key_id   text default 'runesignal-ed25519-v1',
  eu_ai_act_ref   text default 'Article 15',
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_red_team_reports_tenant on red_team_reports(tenant_id, created_at desc);
create index if not exists idx_red_team_reports_agent  on red_team_reports(tenant_id, agent_id);

alter table red_team_reports enable row level security;

create policy "tenant_isolation_red_team_reports"
  on red_team_reports for all
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
