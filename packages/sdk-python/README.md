# runesignal

> Official Python SDK for **RuneSignal** — AI Agent Governance Platform

Cryptographically sign every agent action, route high-risk decisions to human reviewers, generate regulator-ready EU AI Act evidence bundles, and monitor agent fleet health.

## Installation

```bash
pip install runesignal
```

## Quick Start

```python
import asyncio
from runesignal import RuneSignalClient

async def main():
    client = RuneSignalClient(
        api_key="rs_live_...",
        agent_id="agt-inventory-manager",  # optional default
    )

    # HITL approval
    ticket = await client.approvals.request_approval(
        agent_id="agt-inventory-manager",
        action_type="database.write",
        action_summary="Update pricing for 4,200 SKUs",
        blast_radius={"reversible": False, "level": "high", "affected_record_count": 4200},
        sla_hours=4,
        sla_auto_action="reject",
        idempotency_key="inv-update-2026-05-08",
    )

    if ticket.status == "approved":
        pass  # proceed

asyncio.run(main())
```

## Modules

### `client.approvals` — HITL Approval Gateway

```python
# Submit and poll for decision
ticket = await client.approvals.request_approval(
    agent_id="agt-001",
    action_type="comms.email",
    action_summary="Send NDA to external counsel",
    blast_radius={"reversible": True, "level": "medium"},
)
print(ticket.status)  # approved | rejected | expired
```

### `client.firewall` — Policy Evaluation

```python
from runesignal import EvaluateRequest

result = await client.firewall.evaluate(
    EvaluateRequest(action="delete_records", resource="db:users")
)
print(result.verdict)  # allow | block | escalate
```

### `client.evidence` — EU AI Act Evidence Bundles

```python
# Preview coverage gaps
preview = await client.evidence.preview(
    regulation="eu_ai_act",
    date_from="2026-01-01",
    date_to="2026-03-31",
)
print(f"Coverage: {preview.overall_score}% · Gaps: {len(preview.gaps)}")

# Generate a signed bundle
bundle = await client.evidence.generate(
    regulation="eu_ai_act",
    date_from="2026-01-01",
    date_to="2026-03-31",
)
```

### `client.provenance` — Ed25519 Cryptographic Signing

```python
from runesignal import CertifyRequest

cert = await client.provenance.certify(CertifyRequest(
    provider="openai",
    model="gpt-4o",
    prompt=str(messages),
    completion=response_text,
))
print(cert.signature)
```

### `client.incidents` — Incident Reporting

```python
await client.incidents.create(
    title="Agent accessed PII outside declared scope",
    description="Agent agt-001 read customer addresses during product lookup",
    category="data_breach",
    severity="high",
    reported_by="agt-001",
    idempotency_key="breach-agt001-2026-05",
)
```

### `client.controls` — Compliance Controls

```python
result = await client.controls.seed("eu_ai_act")
print(f"Seeded {result.seeded} controls")

summary = await client.controls.status()
print(f"{summary.passing}/{summary.total} controls passing ({summary.overall_health_pct:.0f}%)")
```

### `client.metrics` — Platform KPIs

```python
m = await client.metrics.get()
print(m.health_status)  # healthy | at_risk | critical
```

## CrewAI Integration

```python
from runesignal.crewai import RuneSignalObserver

crew = Crew(
    agents=[...],
    tasks=[...],
    observers=[RuneSignalObserver(api_key="rs_live_...")],
)
```

## AutoGen Integration

```python
from runesignal.autogen import RuneSignalMiddleware

manager = RuneSignalMiddleware.wrap(
    GroupChatManager(groupchat=groupchat, llm_config=llm_config),
    api_key="rs_live_...",
)
```

## Requirements

- Python ≥ 3.9
- `httpx` ≥ 0.27

## License

MIT
