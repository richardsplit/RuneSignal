# @runesignal/sdk

Track, attribute, and reduce AI inference costs — per customer, per feature, per endpoint.

## Install

```bash
npm install @runesignal/sdk
# or
yarn add @runesignal/sdk
# or
pnpm add @runesignal/sdk
```

## Quick start

```ts
import OpenAI from 'openai';
import RuneSignal from '@runesignal/sdk';

// Call once at app startup
RuneSignal.configure({ apiKey: 'rs_live_YOUR_KEY' });

const openai = new OpenAI();

// Option A — log() after each call (simplest, no latency tracking)
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
});
RuneSignal.log(response, { customerId: user.id, featureTag: 'summarize' });

// Option B — track() wrapper (captures latency automatically)
const summarize = RuneSignal.track(
  async (text: string) => openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: text }],
  }),
  { customerId: user.id, featureTag: 'summarize', endpointId: 'POST /summarize' },
);
const result = await summarize(userText);
```

## Proxy mode (budget guardrails)

Route all calls through the RuneSignal proxy — enforces budget policies before forwarding:

```ts
import OpenAI from 'openai';
import RuneSignal from '@runesignal/sdk';

RuneSignal.configure({ apiKey: 'rs_live_YOUR_KEY' });

const openai = new OpenAI({
  baseURL: RuneSignal.proxyUrl(),    // https://api.runesignal.com/proxy/openai/v1
  defaultHeaders: {
    'X-Customer-Id': user.id,       // customer-scoped budget limits
  },
});
```

## What gets captured

| Field | Source |
|---|---|
| `model` | `response.model` |
| `input_tokens` | `usage.prompt_tokens` |
| `output_tokens` | `usage.completion_tokens` |
| `cached_tokens` | `usage.prompt_tokens_details.cached_tokens` |
| `reasoning_tokens` | `usage.completion_tokens_details.reasoning_tokens` |
| `cost_usd` | Calculated from built-in pricing table |
| `latency_ms` | Wall-clock (only with `track()` wrapper) |

## Supported providers

Works with any response object that matches OpenAI or Anthropic shape:

- **OpenAI** (`openai` ≥ 4.0, `openai` ≥ 1.0 beta)
- **Anthropic** (`@anthropic-ai/sdk` — detected by `usage.input_tokens`)
- **Azure OpenAI** — same shape as OpenAI
- **LangChain**, **Vercel AI SDK** — pass the raw LLM response

## Safety guarantees

- **Never throws** — all exceptions inside the SDK are swallowed
- **Never blocks** — logs are dispatched via `setImmediate` (fire-and-forget)
- **Never stores prompts** — only token counts and metadata

## Environment variables

| Variable | Description |
|---|---|
| `RUNESIGNAL_API_KEY` | Your RuneSignal API key |
| `RUNESIGNAL_BASE_URL` | Override the ingest endpoint (for self-hosted) |

## License

MIT
