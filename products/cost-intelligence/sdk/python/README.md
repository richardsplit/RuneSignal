# runesignal Python SDK

Track, attribute, and reduce AI inference costs — per customer, per feature, per endpoint.

## Install

```bash
pip install runesignal
```

## Quick start

```python
import runesignal

# Call once at startup
runesignal.configure(api_key="rs_live_YOUR_KEY")

# Decorate any async function that calls an LLM
@runesignal.track(customer_id=user.id, feature_tag="summarize", endpoint_id="POST /summarize")
async def summarize(text: str) -> str:
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": text}],
    )
    return response.choices[0].message.content
```

That's it. RuneSignal captures model, token counts, cost, and latency — then ships the log in the background without blocking your code.

## What gets captured

| Field | Source |
|---|---|
| `model` | `response.model` |
| `input_tokens` | `response.usage.prompt_tokens` |
| `output_tokens` | `response.usage.completion_tokens` |
| `cached_tokens` | `response.usage.prompt_tokens_details.cached_tokens` |
| `cost_usd` | Calculated from current pricing table |
| `latency_ms` | Wall-clock time around your function |
| `customer_id` | Your parameter |
| `feature_tag` | Your parameter |
| `endpoint_id` | Your parameter (defaults to function name) |

## Supported providers

Works with any provider that returns an OpenAI-compatible response object (`.usage.prompt_tokens`, `.usage.completion_tokens`). Explicitly tested with:

- OpenAI (`openai` ≥ 1.0)
- Anthropic (`anthropic` ≥ 0.25, returns `.usage.input_tokens` / `.usage.output_tokens`)
- Google Gemini (via `google-generativeai` with OpenAI-compat adapter)

## Proxy mode (no decorator needed)

Instead of decorating individual functions, you can route all OpenAI calls through the RuneSignal proxy. The proxy forwards requests unchanged and logs in the background:

```python
import openai
import runesignal

runesignal.configure(api_key="rs_live_YOUR_KEY")

client = openai.AsyncOpenAI(
    base_url=runesignal.proxy_url(),   # https://api.runesignal.com/proxy/openai/v1
    api_key="your-openai-key",         # still required by the OpenAI SDK
    default_headers={"X-Customer-Id": user.id},
)
```

## Safety guarantees

- **Never raises** — all exceptions inside the SDK are swallowed. Your code path is never affected.
- **Never blocks** — logs are shipped with `asyncio.create_task` (fire-and-forget).
- **Never stores prompts or completions** — only token counts and metadata.

## Environment variables

| Variable | Description |
|---|---|
| `RUNESIGNAL_API_KEY` | Your RuneSignal API key (alternative to `configure(api_key=...)`) |
| `RUNESIGNAL_BASE_URL` | Override the ingest endpoint (useful for self-hosted or local dev) |

## Pricing table

The SDK ships with a built-in pricing table (`runesignal._cost_table.PRICING`). It covers all major OpenAI, Anthropic, and Gemini models. Update it by bumping the SDK version or overriding `PRICING` directly.

## License

MIT
