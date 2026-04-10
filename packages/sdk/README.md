# @trustlayer/sdk

AI Agent Compliance Middleware — EU AI Act ready.

Cryptographically sign every agent action, route high-risk actions to human approval, and generate regulator-ready evidence packages on demand.

## Installation

```bash
npm install @trustlayer/sdk
```

## Quick Start

```typescript
import { TrustLayer } from '@trustlayer/sdk';

const tl = new TrustLayer({ apiKey: process.env.TL_API_KEY });

// Wrap any action requiring human oversight
const result = await tl.hitl.requestApproval({
  agentId: 'sales-agent-v2',
  action: 'send_proposal_email',
  payload: { to: 'ceo@bigcorp.com', subject: '...', body: '...' },
  blastRadius: 'high',
  reversible: false,
});

if (result.status === 'approved') {
  // proceed with action
} else {
  // abort, log, notify
}
```

## API

### `tl.hitl.requestApproval(options)` → `Promise<ApprovalResponse>`

Submit an agent action for human approval. Polls until a decision is made.

### `tl.hitl.createApproval(options)` → `Promise<{ approvalId, reviewUrl, expiresAt }>`

Create an approval request without waiting for a decision (fire-and-forget).

### `tl.ledger.sign(options)` → `Promise<LedgerEntry>`

Cryptographically sign an action into the immutable audit ledger (Ed25519).

### `tl.agents.register(options)` → `Promise<AgentRegistration>`

Auto-register this agent in the organization's agent inventory.

### `tl.policy.evaluate(action)` → `Promise<PolicyEvaluationResult>`

Evaluate whether an action requires human oversight based on org policy.

### `tl.wrap(options, fn)` → `Promise<T>`

Convenience wrapper — gates execution of `fn` behind HITL approval.

```typescript
await tl.wrap(
  { action: 'delete_records', payload: { table: 'users', ids: [...] }, blastRadius: 'critical', reversible: false },
  async () => {
    await db.deleteUsers(ids);
  }
);
```

## LangChain Integration

```typescript
import { TrustLayerCallbackHandler } from '@trustlayer/langchain-plugin';

const agent = AgentExecutor.fromAgentAndTools({
  // ...
  callbacks: [new TrustLayerCallbackHandler(tl)],
});
```

## Requirements

- Node.js 18+
- TypeScript 5+
- ESM-compatible

## EU AI Act

This SDK helps satisfy:
- **Article 13**: Transparency — every action is logged and signed
- **Article 14**: Human oversight — HITL routing for high-risk actions
- **Article 17**: Quality management — policy evaluation and anomaly detection

## License

MIT
