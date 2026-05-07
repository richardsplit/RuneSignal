-- Migration 059: MCP Server Registry (Phase 10 — S_MCP)
-- Stores registered MCP servers per tenant.
-- EU AI Act Article 26 — deployer obligations for orchestrated agent systems.

create table if not exists mcp_servers (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  endpoint      text not null,
  trust_level   text not null default 'untrusted'
                  check (trust_level in ('trusted','verified','untrusted','blocked')),
  owner_tenant  uuid references tenants(id),
  description   text,
  capabilities  jsonb not null default '[]',
  metadata      jsonb not null default '{}',
  call_count    bigint not null default 0,
  hitl_count    bigint not null default 0,
  blocked_count bigint not null default 0,
  last_called_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_mcp_servers_tenant on mcp_servers(tenant_id, created_at desc);

alter table mcp_servers enable row level security;
create policy "tenant_isolation_mcp_servers"
  on mcp_servers for all
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- MCP invocation log
create table if not exists mcp_invocations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  server_id       uuid references mcp_servers(id) on delete set null,
  agent_id        text,
  tool_name       text not null,
  input_hash      text,
  risk_score      integer not null default 0,
  conflict_result jsonb,
  hitl_required   boolean not null default false,
  hitl_request_id uuid,
  outcome         text not null default 'allowed'
                    check (outcome in ('allowed','blocked','hitl_pending','hitl_approved','hitl_rejected')),
  audit_event_id  text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_mcp_invocations_tenant on mcp_invocations(tenant_id, created_at desc);
create index if not exists idx_mcp_invocations_server on mcp_invocations(server_id, created_at desc);

alter table mcp_invocations enable row level security;
create policy "tenant_isolation_mcp_invocations"
  on mcp_invocations for all
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
