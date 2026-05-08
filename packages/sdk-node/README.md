# runesignal

> Official Node.js SDK for **RuneSignal** — AI Agent Governance Platform

Cryptographically sign every agent action, route high-risk decisions to human reviewers, generate regulator-ready EU AI Act evidence bundles, and monitor agent fleet health — all from one SDK.

## Installation

```bash
npm install runesignal
```

## Quick Start

```typescript
import { RuneSignalClient } from 'runesignal';

const client = new RuneSignalClient({
  apiKey: process.env.RUNESIGNAL_API_KEY!,  // rs_live_...
  agentId: 'agt-inventory-manager',          // optional default
});
```

## Modules

### `client.approvals` — HITL Approval Gateway

```typescript
// Submit and wait for a human decision
const ticket = await client.approvals.requestApproval({
  agentId: 'agt-inventory-manager',
  actionType: 'database.write',
  actionSummary: 'Update pricing for 4,200 SKUs',
  blastRadius: { reversible: false, level: 'high', affectedRecordCount: 4200 },
  slaHours: 4,
  slaAutoAction: 'reject',
  idempotencyKey: 'inv-update-2026-05-08',
});

if (ticket.status === 'approved') {
  // proceed
}
```

### `client.firewall` — Policy Evaluation

```typescript
const result = await client.firewall.evaluate({
  action: 'send_proposal_email',
  resource: 'comms:email',
  description: 'Send NDA to external counsel',
  domain: 'comms',
});
// result.verdict → 'allow' | 'block' | 'escalate'
```

### `client.evidence` — EU AI Act Evidence Bundles

```typescript
// Preview coverage gaps before generating
const preview = await client.evidence.preview({
  regulation: 'eu_ai_act',
  dateFrom: '2026-01-01',
  dateTo: '2026-03-31',
});
console.log(`Coverage: ${preview.overallScore}% · Gaps: ${preview.gaps.length}`);

// Generate and sign a bundle
const bundle = await client.evidence.generate({
  regulation: 'eu_ai_act',
  dateFrom: '2026-01-01',
  dateTo: '2026-03-31',
});
```

### `client.agents` — Agent Registry

```typescript
await client.agents.register({
  agent_name: 'InventoryManager',
  agent_type: 'task',
  framework: 'langgraph',
  version: '1.2.0',
});
```

### `client.provenance` — Ed25519 Cryptographic Signing

```typescript
const cert = await client.provenance.certify({
  provider: 'openai',
  model: 'gpt-4o',
  prompt: JSON.stringify(messages),
  completion: response.choices[0].message.content,
});
console.log(cert.signature); // Ed25519 signature
```

### `client.incidents` — Incident Reporting

```typescript
await client.incidents.create({
  title: 'Agent accessed PII outside declared scope',
  category: 'data_breach',
  severity: 'high',
  reportedBy: 'agt-001',
  idempotencyKey: 'breach-agt001-2026-05',
});
```

### `client.controls` — Compliance Controls

```typescript
const { seeded } = await client.controls.seed('eu_ai_act');
const summary = await client.controls.status();
console.log(`${summary.passing}/${summary.total} controls passing`);
```

### `client.metrics` — Platform KPIs

```typescript
const m = await client.metrics.get();
// m.healthStatus → 'healthy' | 'at_risk' | 'critical'
```

## LangChain Integration

```typescript
import { RuneSignalCallbackHandler } from '@runesignal/langchain-plugin';

const agent = AgentExecutor.fromAgentAndTools({
  agent: myAgent,
  tools: myTools,
  callbacks: [new RuneSignalCallbackHandler(client)],
});
// Every tool call is now firewall-evaluated and signed
```

## EU AI Act Articles Covered

| Article | Requirement | Module |
|---|---|---|
| Art. 13 | Transparency — log every action | `provenance` |
| Art. 14 | Human oversight — HITL for high-risk | `approvals`, `firewall` |
| Art. 17 | Quality management — policy & anomaly | `controls`, `firewall` |
| Art. 9  | Risk management | `evidence` |

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (optional but recommended)

## License

MIT
