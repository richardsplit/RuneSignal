# RuneSignal — Testing Guide

End-to-end testing instructions for all five RuneSignal features.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | `node --version` to verify |
| Dependencies installed | `npm install` in the project root |
| Supabase project | Migrations applied: `npx supabase db push` |
| Dev server running | `npm run dev` → [http://localhost:3000](http://localhost:3000) |
| Valid auth session | Sign in at `/login`; grab the Bearer token from the Supabase session (browser DevTools → Application → Local Storage → `supabase.auth.token`) |

### `.env.local` (required variables)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
STRIPE_SECRET_KEY=sk_test_...          # required for billing tests
NEXT_PUBLIC_TENANT_ID=<uuid>           # optional; defaults to demo-tenant
```

> **Important:** `NEXT_PUBLIC_TENANT_ID` must be a valid UUID from your `tenants` table. String values like `"demo-tenant"` will cause a Postgres type error (see Troubleshooting).

---

## Feature 1 — EU AI Act Evidence Report Generator

The Report Generator inspects all agents registered under your tenant and maps their declared capabilities, risk tier, and audit events to the relevant articles of the EU AI Act (Articles 9, 13, 14, 17, etc.). It produces a structured JSON evidence pack that can be exported for compliance audits.

### cURL — Generate a report

```bash
curl -X POST http://localhost:3000/api/v1/compliance/reports/eu-ai-act \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "scope": "all_agents",
    "include_audit_events": true
  }'
```

**Expected response:**

```json
{
  "report_id": "rpt_abc123",
  "status": "generating",
  "tenant_id": "<your-tenant-uuid>",
  "articles_mapped": ["Art. 9", "Art. 13", "Art. 14", "Art. 17"],
  "created_at": "2024-11-01T12:00:00Z",
  "estimated_completion_ms": 3000
}
```

### cURL — List reports

```bash
curl http://localhost:3000/api/v1/compliance/reports \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>"
```

### UI testing

1. Navigate to `/compliance/reports`.
2. Click **Generate EU AI Act Report**.
3. A progress indicator appears while the report is generating (`status: "generating"`).
4. When complete, the report appears in the table with a download link.

### Supabase verification

Check the `compliance_evidence_reports` table in Supabase Studio. New rows appear with `status = 'complete'` once generation finishes. The `evidence_payload` JSONB column holds the full article mapping.

---

## Feature 2 — HITL Approval API with Blast Radius Scoring

**Blast radius scoring** quantifies the potential damage an AI agent action could cause if it executes incorrectly or maliciously. The score is an integer on a **1–10 scale** (1 = negligible impact, 10 = catastrophic / irreversible). Scores above a configurable threshold (default: 7) automatically route actions to the Human-in-the-Loop (HITL) review queue before execution is permitted.

### cURL — Create an exception (pending approval)

```bash
curl -X POST http://localhost:3000/api/v1/exceptions \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "agent_id": "agent-uuid-here",
    "action": "bulk_delete_records",
    "payload": { "table": "customers", "filter": "inactive = true" },
    "requested_by": "agent-uuid-here"
  }'
```

### cURL — Resolve an exception (approve/reject)

```bash
curl -X POST http://localhost:3000/api/v1/exceptions/<exception-id>/resolve \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "action": "approve",
    "reason": "Reviewed and confirmed scope is limited to inactive accounts only.",
    "reviewer_id": "user-uuid-here"
  }'
```

**Response includes blast radius:**

```json
{
  "exception_id": "exc_xyz789",
  "status": "approved",
  "action": "approve",
  "blast_radius_score": 8,
  "blast_radius_factors": ["bulk_operation", "irreversible", "cross_table_join"],
  "resolved_by": "user-uuid-here",
  "resolved_at": "2024-11-01T12:05:00Z"
}
```

### cURL — Get blast radius for an agent action directly

```bash
curl -X POST http://localhost:3000/api/v1/exceptions/blast-radius \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "agent_id": "agent-uuid-here",
    "action": "send_email",
    "payload": { "to": "all-users@example.com", "subject": "Important update" }
  }'
```

### UI testing

1. Navigate to `/exceptions` (Review Queue).
2. Pending exceptions with high blast radius scores are highlighted in the queue.
3. Use the **Approve** or **Reject** buttons to resolve each item.
4. The blast radius score is displayed on each card alongside the action details.

---

## Feature 3 — Agent Inventory & Shadow AI Discovery

The Agent Inventory tracks every AI worker registered under your tenant via the NHI (Non-Human Identity) registry. Shadow AI Discovery detects AI agents that are making API calls or consuming resources but have **not** been registered — these appear as `shadow_detected: true` in responses.

### cURL — List all agents

```bash
curl http://localhost:3000/api/v1/agent-inventory \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>"
```

### cURL — List with Shadow AI filter

```bash
curl "http://localhost:3000/api/v1/agent-inventory?include_shadow=true&risk_threshold=medium" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>"
```

Undeclared agents appear with `shadow_detected: true`:

```json
{
  "agents": [
    {
      "agent_id": "sha_unknown_7f3a",
      "shadow_detected": true,
      "last_seen": "2024-11-01T11:58:00Z",
      "risk_level": "high",
      "inferred_capabilities": ["read_database", "http_egress"]
    }
  ]
}
```

### cURL — Register a new agent

```bash
curl -X POST http://localhost:3000/api/v1/agent-inventory \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Invoice Processing Agent",
    "type": "llm_worker",
    "capabilities": ["read_invoices", "write_payments"],
    "risk_tier": "high",
    "owner_team": "finance-ops"
  }'
```

### UI testing

1. Navigate to `/identity` (Agent Identity page).
2. The inventory table lists all registered agents with their risk tier and last-seen timestamp.
3. Shadow agents appear in a separate **Unregistered / Shadow AI** section with a warning badge.
4. Click **Register** on a shadow agent to promote it to the official inventory.

### Supabase verification

Check the `agent_inventory` table. Shadow agents have `shadow_detected = true` and `registered_at = null` until formally registered.

---

## Feature 4 — Integration Adapters (Slack, ServiceNow, Jira)

Adapters route RuneSignal alerts, exceptions, and compliance events to your existing tooling. When `NODE_ENV !== 'production'`, all adapters log their payloads to the console instead of making real outbound calls — safe for local testing without credentials.

### Configure an adapter

```bash
curl -X POST http://localhost:3000/api/v1/integrations/configure \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "adapter_type": "slack",
    "config": {
      "webhook_url": "https://hooks.slack.com/services/T000/B000/xxxx",
      "channel": "#ai-alerts",
      "notify_on": ["exception_created", "shadow_ai_detected", "blast_radius_high"]
    }
  }'
```

### Trigger a Slack notification

```bash
curl -X POST http://localhost:3000/api/v1/integrations/slack/notify \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "event_type": "exception_created",
    "message": "High blast-radius action pending approval",
    "exception_id": "exc_xyz789"
  }'
```

### Create a ServiceNow incident

```bash
curl -X POST http://localhost:3000/api/v1/integrations/servicenow/incident \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "short_description": "Shadow AI agent detected in production",
    "urgency": 2,
    "impact": 2,
    "category": "AI Governance",
    "agent_id": "sha_unknown_7f3a"
  }'
```

### Create a Jira ticket

```bash
curl -X POST http://localhost:3000/api/v1/integrations/jira/ticket \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <your-tenant-uuid>" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "project_key": "AIOPS",
    "summary": "HITL exception requires review — blast radius 9",
    "description": "Exception exc_xyz789 has a blast radius score of 9. Immediate human review required.",
    "issue_type": "Task",
    "priority": "High",
    "exception_id": "exc_xyz789"
  }'
```

### Testing without real credentials

In development (`NODE_ENV=development`), adapter calls are intercepted and logged to stdout:

```
[RuneSignal Adapter] SLACK (dry-run) → payload: { event_type: 'exception_created', ... }
[RuneSignal Adapter] SERVICENOW (dry-run) → incident payload: { short_description: '...', ... }
```

No real webhooks or API calls are made.

### UI configuration

Navigate to `/account-settings/sso` and select the **Integrations** tab. Each adapter has a configuration panel where you can paste credentials, test the connection, and toggle individual event triggers.

---

## Feature 5 — Developer SDK + LangChain Plugin

The SDK provides a typed TypeScript client for logging agent actions, querying the inventory, and triggering compliance checks from any Node.js or edge runtime. The LangChain plugin wraps the SDK as a `CallbackHandler`, automatically logging every chain/agent event to RuneSignal without manual instrumentation.

### Installation

```bash
# Core SDK
npm install @runesignal/sdk

# LangChain plugin (peer dep: langchain >= 0.1.0)
npm install @runesignal/langchain-plugin
```

### SDK basic usage (TypeScript)

```ts
import { RuneSignalClient } from '@runesignal/sdk';

const client = new RuneSignalClient({
  tenantId: process.env.RUNESIGNAL_TENANT_ID!,
  apiKey: process.env.RUNESIGNAL_API_KEY!,
  baseUrl: 'https://your-instance.runesignal.io',
});

// Log an agent action (returns blast radius score + any pending exceptions)
const result = await client.logAction({
  agentId: 'my-agent',
  action: 'send_email',
  payload: { to: 'user@example.com', subject: 'Quarterly report' },
});

console.log(result.blast_radius_score); // e.g. 3
console.log(result.requires_approval);  // false
```

### LangChain plugin usage

```ts
import { RuneSignalCallbackHandler } from '@runesignal/langchain-plugin';
import { LLMChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';

const llm = new OpenAI({ temperature: 0 });

const handler = new RuneSignalCallbackHandler({
  tenantId: process.env.RUNESIGNAL_TENANT_ID!,
  agentId: 'my-langchain-agent',
});

const chain = new LLMChain({ llm, prompt, callbacks: [handler] });

// Every chain run, tool call, and LLM invocation is automatically
// logged to RuneSignal with blast radius scoring applied.
await chain.call({ input: 'Summarize last quarter earnings.' });
```

### Local package development & testing

```bash
# Build the SDK
cd packages/sdk && npm run build

# Link globally
npm link

# In your consumer project
npm link @runesignal/sdk
```

For the LangChain plugin:

```bash
cd packages/langchain-plugin && npm run build && npm link
# In consumer:
npm link @runesignal/langchain-plugin
```

### Verifying it works

After running a chain or calling `client.logAction()`, check the Supabase `agent_events` table:

```sql
SELECT * FROM agent_events
WHERE tenant_id = '<your-tenant-uuid>'
ORDER BY created_at DESC
LIMIT 10;
```

New rows should appear for each SDK call. The `blast_radius_score` and `action_payload` columns are populated automatically. If rows are not appearing, confirm `RUNESIGNAL_API_KEY` is set and that `baseUrl` points to your running dev server.

---

## Troubleshooting

### 1. `useTenant must be used within a TenantProvider`

This error appears when a component using the `useTenant` hook is rendered outside the `TenantProvider` tree (e.g., on a public page). It is fixed in the latest dev branch.

**Fix:** `git pull origin dev && npm install && npm run dev`

---

### 2. `invalid input syntax for type uuid: "demo-tenant"`

Postgres requires a valid UUID for the `tenant_id` column. The string `"demo-tenant"` is not a valid UUID.

**Fix:** Add a real UUID to `.env.local`:

```env
NEXT_PUBLIC_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Find valid tenant UUIDs in the Supabase `tenants` table:

```sql
SELECT id, name FROM tenants LIMIT 10;
```

---

### 3. Stripe checkout fails

Stripe calls will fail if the secret key is missing or if you mix live and test mode keys.

**Fix:**
- Confirm `STRIPE_SECRET_KEY` is set in `.env.local` and starts with `sk_test_` for local development.
- Restart the dev server after updating `.env.local` (`Ctrl-C` → `npm run dev`).
- Ensure the Stripe webhook endpoint is configured in the Stripe Dashboard (or use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`).

---

### 4. Shadow AI shows no results

The Shadow AI discovery query runs against the `agent_inventory` table. If the table is empty, no shadow agents are returned.

**Fix:** Run the seed migration to insert test data:

```bash
npx supabase db push           # apply pending migrations
npx supabase db seed           # run seed files if present
```

Or insert rows manually in Supabase Studio:

```sql
INSERT INTO agent_inventory (tenant_id, name, shadow_detected, risk_level, last_seen)
VALUES
  ('<your-tenant-uuid>', 'shadow-agent-test-1', true, 'high', now()),
  ('<your-tenant-uuid>', 'shadow-agent-test-2', true, 'medium', now() - interval '2 hours');
```

Then re-query `/api/v1/agent-inventory?include_shadow=true`.
