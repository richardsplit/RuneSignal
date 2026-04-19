# RuneSignal SDK — Developer Reference

> TypeScript-first SDK for integrating AI agents with the RuneSignal compliance and governance platform.

---

## Installation

```bash
npm install runesignal
# or
yarn add runesignal
```

Set environment variables:

```bash
RUNESIGNAL_API_KEY=rs_live_...
RUNESIGNAL_BASE_URL=https://your-tenant.runesignal.com   # default: https://api.runesignal.com
```

---

## Quick Start

```ts
import { RuneSignalClient } from 'runesignal';

const client = new RuneSignalClient({
  apiKey: process.env.RUNESIGNAL_API_KEY!,
  baseUrl: process.env.RUNESIGNAL_BASE_URL,
});
```

---

## Modules

### `client.approvals` — HITL Approval Gateway

Submit a human-in-the-loop approval request before executing a sensitive agent action.

```ts
// Submit with idempotency key (safe to retry)
const ticket = await client.approvals.submit({
  agent_id:         'agt-inventory-manager',
  action_type:      'database.write',
  action_summary:   'Update pricing for 4,200 SKUs',
  blast_radius: {
    reversible:           false,
    affects_external_system: false,
    data_classification:  'internal',
    affected_record_count: 4200,
  },
  sla_hours:        4,
  sla_auto_action:  'reject',         // auto-reject if SLA expires
  idempotency_key:  'inv-update-2026-04-19',
});

// Poll for decision
const decision = await client.approvals.poll(ticket.id, {
  intervalMs: 5_000,
  timeoutMs:  ticket.sla_deadline
    ? new Date(ticket.sla_deadline).getTime() - Date.now()
    : 60_000,
});

if (decision.status === 'approved') {
  // proceed with action
} else {
  // abort or fall back
}
```

**Auto-approve policy** — requests with `blast_radius.level === 'low'` and `action_type` prefixed with `comms.` are automatically approved when `ENABLE_AUTO_APPROVE=true` is set on the server.

---

### `client.incidents` — Incident Reporting

Report a compliance incident or anomaly escalation.

```ts
const incident = await client.incidents.create({
  title:       'Unauthorised data access — agent agt-001',
  category:    'data_breach',
  severity:    'high',
  reported_by: 'agt-001',
  description: 'Agent attempted to read PII outside its declared scope',
  related_agent_ids: ['agt-001'],
  is_serious_incident: false,
  idempotency_key: 'breach-agt001-20260419',
});
```

**Idempotency** — pass the same `idempotency_key` within a 5-minute window to receive the original incident ID without creating a duplicate.

---

### `client.evidence` — Compliance Evidence Bundles

Generate a signed evidence bundle for a regulation period.

```ts
// Dry-run (preview coverage without saving)
const preview = await client.evidence.preview({
  regulation:  'eu_ai_act',
  date_from:   '2026-01-01',
  date_to:     '2026-03-31',
  agent_ids:   ['agt-001', 'agt-002'],   // omit for all agents
});

console.log(`Coverage: ${preview.overall_score}%`);
console.log(`Gaps: ${preview.gaps.length}`);

// Generate and persist
const bundle = await client.evidence.generate({
  regulation:  'eu_ai_act',
  date_from:   '2026-01-01',
  date_to:     '2026-03-31',
  agent_ids:   ['agt-001'],
});

// Download JSON
const manifest = await client.evidence.download(bundle.id, 'json');
```

---

### `client.agents` — Agent Registry

Register or look up AI agents.

```ts
// Register a new agent
const cred = await client.agents.register({
  agent_name:  'InventoryManager',
  agent_type:  'task',
  framework:   'langgraph',
  version:     '1.2.0',
});

// List active agents
const { agents } = await client.agents.list({ status: 'active' });

// Export in Veza resource-graph format
const vezaExport = await client.agents.export('veza');
```

---

### `client.controls` — Compliance Controls

Seed and evaluate compliance controls for continuous monitoring.

```ts
// Seed default controls for the tenant (idempotent)
const { seeded, skipped } = await client.controls.seed();

// Trigger an immediate evaluation
await client.controls.evaluate(controlId);

// Get control health summary
const summary = await client.controls.status();
console.log(`Passing: ${summary.passing} | Failing: ${summary.failing}`);
```

---

### `client.metrics` — Platform Metrics

Aggregate compliance KPIs for dashboards.

```ts
const metrics = await client.metrics.get();
// {
//   summary: { agents, active_intents, open_exceptions, violations_today },
//   approvals: { open, approved_today, auto_approved_today, sla_breached },
//   incidents: { open, serious },
//   controls: { passing, failing },
//   health_status: 'healthy' | 'at_risk' | 'critical'
// }
```

---

## Full Example — Approval Gateway

See [`examples/approval-gateway.ts`](../../examples/approval-gateway.ts) for a complete walkthrough including:

- Submitting approval requests with idempotency
- Polling for decision with timeout
- Handling low-risk auto-approval
- SLA expiry auto-action routing

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/approval-requests` | POST | Submit HITL approval request |
| `/api/v1/approval-requests/{id}/resolve` | POST | Approve / reject ticket |
| `/api/v1/incidents` | POST | Create incident |
| `/api/v1/compliance/evidence-preview` | GET | Dry-run coverage preview |
| `/api/v1/compliance/evidence-export` | POST | Generate evidence bundle |
| `/api/v1/compliance/evidence-bundles` | GET | List past bundles |
| `/api/v1/agents` | GET / POST | List / register agents |
| `/api/v1/agents/export` | GET | Export registry (json, csv, veza) |
| `/api/v1/controls` | GET / POST | List / create controls |
| `/api/v1/controls/seed` | POST | Seed default controls |
| `/api/v1/controls/{id}/evaluate` | POST | Evaluate a control |
| `/api/v1/metrics` | GET | Platform KPI metrics |
| `/api/v1/auth/me` | GET | Current user profile + role |

---

## Authentication

All requests require one of:

- **API Key** header: `Authorization: Bearer rs_live_...`
- **Session cookie** (browser / SSR): handled automatically by `@supabase/ssr`

Tenant is resolved from:
1. `X-Tenant-Id` header
2. API key lookup in `api_keys` table

---

## RBAC

| Role | Permissions |
|---|---|
| `owner` | Full access |
| `compliance_officer` | Controls, incidents, evidence, audit |
| `engineer` | Agents, approvals, anomaly, firewall |
| `auditor` | Read-only: compliance, evidence, audit |

Roles are stored in `tenant_members.role` (Migration 053).
