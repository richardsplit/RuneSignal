# @trustlayer/langchain-plugin

TrustLayer integration for LangChain agents.

Transparently wraps all agent tool calls with cryptographic signing and automatic HITL routing — no changes to your existing agent code required.

## Installation

```bash
npm install @trustlayer/langchain-plugin @trustlayer/sdk
```

## Usage

```typescript
import { TrustLayer } from '@trustlayer/sdk';
import { TrustLayerCallbackHandler } from '@trustlayer/langchain-plugin';
import { AgentExecutor } from 'langchain/agents';

const tl = new TrustLayer({ apiKey: process.env.TL_API_KEY });

const agent = AgentExecutor.fromAgentAndTools({
  agent: myAgent,
  tools: myTools,
  callbacks: [new TrustLayerCallbackHandler(tl)],
});

// Every tool call is now:
// 1. Signed into the TrustLayer audit ledger (Article 13 compliance)
// 2. Evaluated against your org's HITL policy
// 3. Routed to human review if blast radius is high (Article 14 compliance)
```

## License

MIT
