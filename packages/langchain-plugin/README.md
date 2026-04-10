# @runesignal/langchain-plugin

RuneSignal integration for LangChain agents.

Transparently wraps all agent tool calls with cryptographic signing and automatic HITL routing — no changes to your existing agent code required.

## Installation

```bash
npm install @runesignal/langchain-plugin @runesignal/sdk
```

## Usage

```typescript
import { RuneSignal } from '@runesignal/sdk';
import { RuneSignalCallbackHandler } from '@runesignal/langchain-plugin';
import { AgentExecutor } from 'langchain/agents';

const tl = new RuneSignal({ apiKey: process.env.TL_API_KEY });

const agent = AgentExecutor.fromAgentAndTools({
  agent: myAgent,
  tools: myTools,
  callbacks: [new RuneSignalCallbackHandler(tl)],
});

// Every tool call is now:
// 1. Signed into the RuneSignal audit ledger (Article 13 compliance)
// 2. Evaluated against your org's HITL policy
// 3. Routed to human review if blast radius is high (Article 14 compliance)
```

## License

MIT
