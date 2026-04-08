# TrustLayer — Next Phases Roadmap

> **Status as of PR merge:** Phases 1–4 complete (Core Firewall MVP, Workflow Integrations, API Productization, Enterprise Hardening). This document covers everything that comes next.

---

## Quick Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Core Firewall MVP | ✅ Complete |
| 2 | Approval & Workflow Integrations | ✅ Complete |
| 3 | API-First Productization | ✅ Complete |
| 4 | Enterprise Hardening | ✅ Complete |
| **5** | **Critical Fixes & Production Hardening** | 🔴 Next |
| **6** | **New Governance Modules (S9–S14)** | 🔴 Next |
| **7** | **Advanced Platform (S15–S17 + Plugins + Marketplace)** | 🔴 Next |
| **8** | **Long-Term Moat Classification** | 📋 Strategic |

---

## Phase 5 — Critical Fixes & Production Hardening

> These are blocking gaps that need to be resolved before scaling customer acquisition. Some are security issues. All have been flagged in multiple previous reviews.

### 5.1 — Vercel Cron Upgrade ⚠️
**Already noted by you.** The `*/5 * * * *` cron expressions require a Vercel Pro plan.

- **Immediate workaround**: Change cron schedules to `"0 * * * *"` (hourly) until Pro plan is activated.
- **After Pro**: Change back to `"*/5 * * * *"` for HITL SLA enforcement and anomaly detection.
- **Files**: `vercel.json`

---

### 5.2 — Real Authentication & Multi-Tenancy

Currently, `TenantContext` reads a `localStorage` key containing a hardcoded UUID (`7da27c93-6889-4fda-8b22-df4689fbbcd6`). This **must** be replaced before any real users onboard.

**Tasks:**
- [ ] `src/app/login/page.tsx` — Supabase email/password + OAuth login form
- [ ] `src/app/onboarding/page.tsx` — post-signup wizard: collect company name → insert `tenants` row → link `tenant_members`
- [ ] `middleware.ts` — protect all dashboard routes (`/` and sub-routes) with Supabase session check; redirect to `/login` if unauthenticated
- [ ] Global search for `7da27c93-6889-4fda-8b22-df4689fbbcd6` and `localStorage.getItem('tl_tenant_id')` → replace with `supabase.auth.getUser()` server-side checks
- [ ] `src/app/account-settings/mfa/page.tsx` — Supabase TOTP enrollment with QR code; enforce `aal2` at middleware level

---

### 5.3 — API Key Authentication Path in Middleware

The `api_keys` table exists. The `/api/v1/keys` route exists. But the middleware does not actually authenticate external callers using `tl_*` API keys yet — it only checks JWT session tokens. External SDK users cannot make authenticated calls.

**Fix** in `middleware.ts` — after JWT decode fails, fall back to SHA-256 hash lookup:
```typescript
const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
const { data: apiKey } = await supabase
  .from('api_keys')
  .select('tenant_id, scopes, is_active')
  .eq('key_hash', keyHash)
  .eq('is_active', true)
  .single();
if (apiKey) {
  response.headers.set('X-Tenant-Id', apiKey.tenant_id);
  // fire-and-forget last_used_at update
}
```

---

### 5.4 — Plan Limit Enforcement

The billing middleware increments `api_requests_monthly` but never checks it against the plan limit. Starter customers can exceed their tier for free indefinitely.

**Fix** in `middleware.ts` — after `increment_api_usage`:
```typescript
const PLAN_LIMITS = { free: 1000, starter: 50000, pro: 500000, enterprise: Infinity, past_due: 0 };
if (usage >= PLAN_LIMITS[tenant.plan_tier]) {
  return NextResponse.json({ error: 'Monthly API limit reached. Upgrade at /billing.' }, { status: 429 });
}
```

---

### 5.5 — Stripe `invoice.payment_failed` Webhook

The Stripe webhook handler covers `checkout.session.completed` and `subscription.deleted` but not `invoice.payment_failed`. Tenants can accumulate unpaid invoices without having their plan downgraded.

**Fix** in `src/app/api/v1/billing/webhook/route.ts`:
```typescript
case 'invoice.payment_failed': {
  await supabase.from('tenants')
    .update({ plan_tier: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription);
  await WebhookEmitter.notifySlack('⚠️ Payment failed — tenant on past_due', { ... });
  break;
}
```

---

### 5.6 — Wire S5 Insurance State Machine to S3 + S6 + S7

The Insurance Micro-OS state machine transitions claims but **never calls** the governance modules. Every claim transition should:
1. **S6** — validate agent has `insurance:claims:write` permission before any state change
2. **S7** — auto-route to HITL when `financial_impact > $50,000` or `fraud_score > 0.7` (FCRA threshold)
3. **S3** — certify every state transition with an Ed25519 certificate

**File**: `lib/modules/s5-insurance/state-machine.ts` — full replacement provided in `TrustLayer_Master_Expansion_v3.md`.

---

### 5.7 — Split S8 MORALOS Endpoints

`POST /api/v1/moral` currently handles both admin SOUL upsert and agent evaluation in the same handler, distinguished only by body shape. This bypasses role-based access control — any API caller can overwrite the Corporate SOUL.

**Fix**: Split into two routes:
- `src/app/api/v1/moral/soul/route.ts` — `PUT` for admin SOUL upsert (requires `role: admin` claim in JWT); `GET` returns SOUL history
- Keep `src/app/api/v1/moral/route.ts` as evaluation-only `POST` (requires `X-Agent-Id`)

---

### 5.8 — VersionMonitor Fingerprint Storage

`lib/modules/s3-provenance/version-monitor.ts` stores baseline as `'none'`, making model version anomaly detection permanently dormant. Migration `007_version_fingerprints.sql` is already defined but the service never reads from it.

**Fix**: Replace the `'none'` placeholder with real Supabase read/write calls to `model_version_fingerprints`.

---

### 5.9 — CI/CD Pipeline & Testing

**Tasks:**
- [ ] `.github/workflows/main.yml` — checkout → `npm ci` → `npm run build` → `npm run test`; require passing on PRs to main
- [ ] `e2e/auth.spec.ts` — login flow (Playwright)
- [ ] `e2e/dashboard.spec.ts` — navigation smoke test
- [ ] `e2e/api.spec.ts` — verify `/api/v1/firewall/evaluate` returns 200 with valid payload
- [ ] `.env.local.example` — document all required env vars (missing from repo)

---

### 5.10 — Post-Quantum Cryptography Preparation

Ed25519 is quantum-resistant for current threat models, but certificates stored for 7+ years (regulatory requirement) need a PQC migration path. Add `pqc_signature TEXT` column to `audit_events` and dual-sign new events with ML-DSA-65 (NIST FIPS 204) when `ENABLE_PQC=true`.

---

## Phase 6 — New Governance Modules (S9–S14)

> Each module follows the same structure: Supabase migration → service → API routes → dashboard page.

---

### Module S9 — Agent FinOps Control Plane

**Market signal**: 98% of FinOps teams now manage AI spend (FinOps Foundation 2026). Only 44% have financial guardrails. A single LangChain loop ran undetected for 11 days, generating a $47,000 bill. No major agent framework ships a native dollar-denominated budget cap.

**What it does**: Enforce per-agent, per-workflow, and per-tenant budget caps *before* the LLM call executes. Record immutable cost events after execution.

**New DB tables**: `agent_budgets`, `cost_events` (immutable, no UPDATE/DELETE)

**New DB function**: `increment_budget_spend(tenant_id, agent_id, cost)` — atomic, SECURITY DEFINER

**Key service methods**:
- `checkBudget(tenantId, agentId, estimatedTokens, model)` → `{ allowed, remaining_usd, pct_used }` — call BEFORE every LLM call
- `recordCost(tenantId, agentId, model, inputTokens, outputTokens)` → fire-and-forget AFTER call
- `getCostBreakdown(tenantId, periodDays?)` → `{ total, by_agent, by_model, by_workflow }`

**Model pricing** (update quarterly): gpt-4o $0.005/$0.015, claude-opus-4-6 $0.015/$0.075, claude-sonnet-4-6 $0.003/$0.015

**API routes**: `POST /check`, `POST /record`, `GET /breakdown`, `POST|GET /budgets`

**Dashboard**: `/finops` — Total Spend card, Budget Health per agent (progress bars), Cost Over Time chart, Top 10 costliest agents table

**SDK integration**: `ATPClient.chat()` calls `checkBudget()` before and `recordCost()` after every LLM call

**Revenue**: Pro + Enterprise tiers. Standalone: $0.01/budget-check API call

---

### Module S10 — Sovereign AI Data Residency Engine

**Market signal**: 93% of executives say AI sovereignty will be a must in 2026 (IBM IBV). EU AI Act August 2026 enforcement. GDPR Art. 44 restricts personal data transfer to non-adequate countries. EU healthcare AI sending PHI to US OpenAI endpoints is non-compliant today.

**What it does**: Before any LLM call, validate that the data classification + provider + model combination satisfies the tenant's data residency policy. Block or auto-reroute non-compliant calls transparently.

**New DB tables**: `data_residency_policies` (per-tenant policy), `provider_regions` (TrustLayer-curated provider → region mapping, seeded with OpenAI/Anthropic/Azure/Mistral)

**Key service methods**:
- `validateCall(tenantId, provider, model, dataClassification)` → `{ allowed, alternativeProvider?, reason }`
- `getCompliantProviders(tenantId, dataClassification)` → ordered list of compliant alternatives
- `generateResidencyReport(tenantId)` → 30-day cross-border data flow audit

**API routes**: `POST /validate`, `GET /providers`, `PUT /policy`, `GET /report`

**Dashboard**: `/sovereignty` — World map (allowed vs blocked regions), provider compliance table, recent validation event feed

**Revenue**: Pro + Enterprise. Particularly strong for EU financial services and healthcare. Enables €2k EU Financial Services SOUL template upsell.

---

### Module S11 — AI Decision Explainability Engine

**Market signal**: EU AI Act Article 13 mandates "meaningful information about the logic involved" for high-risk AI. GDPR Article 22 gives individuals the right to contest automated decisions. Credo AI generates generic risk reports. TrustLayer has per-call cryptographic evidence — this is reporting against that evidence.

**What it does**: For every certified AI decision (S3 certificate), generate a structured explanation of what inputs drove the output. Link it cryptographically to the certificate. Expose a public auditor endpoint regulators can query by certificate ID.

**New DB table**: `decision_explanations` (public SELECT policy — regulators don't need auth)

**Key service methods**:
- `generateExplanation(tenantId, agentId, certificateId, inputMessages, outputText, model)` — async, does not block response; calls a cheap model (haiku/gpt-4o-mini)
- `getExplanation(certificateId)` — public, no auth required (for regulators)

**Explanation output format** (JSON):
```json
{
  "key_factors": [{ "factor": "string", "weight": 0.0–1.0, "direction": "positive|negative" }],
  "counterfactual": "If X had been Y, the output would have been Z",
  "decision_summary": "Plain English paragraph",
  "confidence_score": 0.0–1.0
}
```

**API routes**: `GET /explain/:certificate_id` (public), `GET /explain` (tenant history), `POST /explain/generate`

**Dashboard**: `/explain` — search by certificate ID, explanation timeline, regulatory context badges (EU AI Act Art 13, GDPR Art 22, FCRA), download as PDF for legal submission

**Revenue**: Pro + Enterprise. Standalone: regulators pay per-certificate for verified explanations. Legal discovery via API.

---

### Module S12 — Non-Human Identity (NHI) Lifecycle Manager

**Market signal**: Only 21.9% of organisations treat AI agents as identity-bearing entities (Cloud Security Alliance 2026). NIST's AI Agent Standards Initiative identifies NHI lifecycle management as a top-priority gap. Traditional OAuth/SAML were designed for static human users, not autonomous agents that chain credentials across org boundaries.

**What it does**: Every agent credential has a managed lifecycle — creation with justified scopes, time-bounded operation, automatic rotation, anomalous-usage detection, and a cryptographically-signed *death certificate* on revocation. No credential is permanent.

**New DB objects**:
- `credential_rotations` (immutable — no UPDATE) — rotation history with Ed25519 death cert signatures
- `agent_spawn_graph` — parent→child agent genealogy
- `agent_credentials` extensions: `credential_class`, `max_session_minutes`, `auto_rotate_days`, `next_rotation_at`, `parent_agent_id`, `delegation_depth`

**Key service methods**:
- `issueEphemeralCredential(tenantId, parentAgentId, purpose, maxMinutes, scopes)` — enforces `delegation_depth` ≤ 3 to prevent runaway spawning
- `rotateCredential(tenantId, agentId, reason)` — generates new JWT, invalidates old, immutable history record
- `revokeWithDeathCertificate(tenantId, agentId, reason)` — Ed25519-signed death certificate
- `getSpawnGraph(tenantId)` — full agent genealogy for visualisation

**Vercel cron**: `0 2 * * *` (daily, safe for Hobby plan) — `POST /api/cron/nhi-rotation`

**API routes**: `POST /nhi/ephemeral`, `POST /nhi/:id/rotate`, `POST /nhi/:id/revoke`, `GET /nhi/spawn-graph`, `GET /nhi/expiring`

**Dashboard**: `/nhi` — D3 tree spawn graph, credential status table with rotation countdown timers, death certificate viewer

**Revenue**: Enterprise tier. CISO buyer. Answers: "Do we know every AI agent? What is it accessing?"

---

### Module S13 — Governance Intelligence Hub

**Market signal**: Credo AI's strongest feature is top-down regulation-to-policy mapping. TrustLayer's differentiator is *inverting* this: 90 days of real agent behaviour in an immutable ledger, automatically mapped to regulatory articles bottom-up. No manual questionnaires. No static checklists.

**What it does**: Mine the audit ledger to automatically map existing evidence (certificates, HITL tickets, moral events) to specific regulatory articles. Identify gaps. Export a regulator-ready evidence package with cryptographic provenance.

**New DB tables**:
- `regulatory_frameworks` — seeded with EU AI Act, NIST RMF, SOC 2 Type II (with article-level evidence requirements)
- `compliance_mappings` — per-tenant compliance status per article (`compliant|partial|gap|unchecked`)

**Seeded frameworks**:
| Framework | Key Articles Mapped |
|-----------|---------------------|
| EU AI Act | Art 13 (transparency), Art 14 (human oversight), Art 17 (quality management), Art 26, Art 50 |
| NIST RMF | Govern, Map, Measure, Manage |
| SOC 2 Type II | CC6 (logical access), CC7 (operations), CC9 (risk mitigation) |

**Key service methods**:
- `generateComplianceReport(tenantId, frameworkId, periodDays?)` — scans audit_events, maps to articles, returns evidence citations + gap list
- `runDailyScan(tenantId)` — cron target; updates `compliance_mappings`, fires Slack alert on new gaps
- `exportEvidencePackage(tenantId, frameworkId)` — JSON array of evidence items, each with Ed25519 signature

**Vercel cron**: `0 6 * * *` (daily, safe for Hobby plan) — `POST /api/cron/compliance-scan`

**API routes**: `GET /compliance/:framework_id`, `GET /compliance/:framework_id/evidence`, `GET /compliance/gaps`, `POST /compliance/:framework_id/enable`

**Dashboard**: `/compliance` — Framework selector tabs, compliance gauge per article (red/amber/green), gap list with remediation steps, export button (PDF/JSON)

**Revenue**: Enterprise tier. EU AI Act compliance package: €5k setup + €2k/month monitoring.

---

### Module S14 — Agent Behaviour Anomaly Detector

**Market signal**: Cisco, Palo Alto, and Microsoft all launched agent-specific security tools at RSA 2026. OWASP Top 10 for Agentic Applications (2026) classifies Goal Hijack (ASI01) and Tool Misuse (ASI02) as highest-priority risks. Only TrustLayer has per-action agent behaviour data in an immutable ledger — the raw material for real behavioural fingerprinting.

**What it does**: Learn each agent's normal behaviour from its audit trail. Auto-suspend and alert when deviation is detected: unusual tool combinations, off-hours activity, cost spikes, privilege escalation patterns, or data exfiltration signatures.

**New DB tables**:
- `agent_baselines` — per-agent behavioural fingerprint: `typical_tools[]`, `typical_resources[]`, `typical_hours_utc` (int4range), `avg_actions_per_hour`, `avg_cost_per_day`
- `behavioral_anomalies` — detected anomalies with severity, auto-suspend flag, linked HITL ticket

**Anomaly types**: `off_hours`, `unusual_tool`, `cost_spike`, `priv_escalation`, `data_exfil_pattern`, `goal_hijack`

**Key service methods**:
- `computeBaseline(tenantId, agentId)` — reads last 30 days of events and costs
- `detectAnomalies(tenantId)` — compares last 24h against baselines; returns anomaly list
- `autoRespondToCritical(...)` — for critical severity: suspend via S6 + create S7 HITL ticket + fire Slack alert
- Goal hijack detection uses **pgvector cosine similarity** against registered agent purpose

**Vercel cron**: `*/15 * * * *` (every 15 min — requires Pro plan) — `POST /api/cron/anomaly-check`

**API routes**: `GET /anomalies`, `GET /anomalies/agent/:id`, `POST /anomalies/:id/resolve`, `GET /baselines`

**Dashboard**: `/anomalies` — Live anomaly feed (severity-tagged), agent health heatmap, baseline comparison viewer per agent

**Revenue**: Pro + Enterprise. CISO buyer motion. Position as "the only agent SIEM built on immutable evidence."

---

## Phase 7 — Advanced Platform (S15–S17 + Plugins + Marketplace)

---

### Module S15 — Physical AI & Robotics Governance

**Market signal**: 58% of enterprises already use physical AI (Deloitte 2026). 80% adoption projected within two years. **No governance vendor has built runtime governance for robot actions** — this is a completely open market today.

**Key insight**: Physical AI actions are irreversible. A robotic arm that moves cannot be un-moved. This makes pre-action governance MORE critical than in software.

**What it does**: Apply the same governance principles to physical AI actions — robotic arms, autonomous forklifts, drones, surgical systems. Before any physical action executes: validate against Corporate SOUL, check zone restrictions, enforce dual-approval for heavy payloads, create tamper-evident record. Emergency stop endpoint integration.

**New DB tables**: `physical_agents` (device registry with GPS/zone), `physical_action_log` (immutable — no UPDATE/DELETE; Ed25519-signed records)

**SOUL extension**: Add `physical: { allowed_zones, require_operator_presence, max_autonomous_payload_kg, blocked_actions_near_humans }` to the Corporate SOUL schema

**API routes**: `POST /physical/preauth`, `POST /physical/:agent_id/stop` (emergency), `POST /physical/outcome`, `GET /physical/agents`, `GET /physical/log`

**Dashboard**: `/physical` — Live physical agent location map, pre-authorisation request queue (HITL integration), action history timeline, **Emergency Stop button** (fires all E-stop endpoints for tenant)

**Revenue**: New vertical entirely. Industrial manufacturers, medical device companies, defence contractors. Enterprise tier minimum €200k/year. First-mover advantage is substantial.

---

### Module S16 — A2A Protocol Governance Gateway

**Market signal**: MCP hit 97M monthly SDK downloads (Feb 2026). A2A (Agent-to-Agent Protocol, Google) is now under the Linux Foundation's Agentic AI Foundation. By 2027, most enterprise agent communication will use MCP (agent↔tool) and A2A (agent↔agent). No governance vendor has built a governance proxy for A2A traffic.

**What it does**: Act as a governance proxy sitting between A2A agents. Every cross-agent task delegation passes through TrustLayer: validate identities (S6), check conflict policies (S1), apply SOUL rules (S8), log the interaction, sign the transaction.

**New DB tables**: `a2a_sessions` (Ed25519-signed session establishment), `a2a_messages` (immutable — no UPDATE/DELETE; SHA-256 content hash + Ed25519 per message)

**Key service methods**:
- `establishSession(tenantId, initiatorId, targetId, taskDescription)` — full governance check, signed session record
- `relayMessage(sessionId, fromAgentId, toAgentId, content)` — signs and logs each hop
- `getSessionGraph(tenantId)` — full A2A interaction map

**API routes**: `POST /a2a/session`, `POST /a2a/session/:id/message`, `POST /a2a/session/:id/close`, `GET /a2a/sessions`, `GET /a2a/graph`

**Dashboard**: `/a2a` — Real-time session graph (D3 force diagram of active agent↔agent connections), message flow timeline, blocked session log

**Revenue**: This becomes the mandatory control plane for multi-agent enterprises. Bill per A2A transaction or as platform fee. Enterprise-scale agent fleets will pay significant amounts.

---

### Module S17 — Automated Agent Red Teaming

**Market signal**: Cisco, Palo Alto, and Microsoft all launched agent red teaming products at RSA 2026. OWASP Top 10 for Agentic Applications 2026 defines ASI01 (Goal Hijack) and ASI02 (Tool Misuse) as the two highest-priority risks. No governance-native platform offers built-in red teaming.

**What it does**: Automatically generate and execute adversarial test cases against tenant agents. Test for prompt injection, goal hijacking, tool misuse, privilege escalation, and data exfiltration patterns. Generate a remediation report mapped to OWASP Agentic Top 10.

**New DB tables**: `red_team_campaigns` (status tracking, OWASP mapping), `red_team_findings` (per-finding severity and remediation)

**Attack types**: prompt injection (20+ adversarial payloads hardcoded in service), goal hijack multi-step chains (ASI01), tool misuse sequences (ASI02), privilege escalation patterns, data exfiltration signatures

**Key service methods**:
- `launchCampaign(tenantId, targetAgentId, campaignType)` — queues campaign, returns ID
- `runPromptInjectionTests(campaignId, agentEndpoint)` — sends 20+ payloads, records responses
- `runGoalHijackTests(campaignId, agentEndpoint)` — multi-step ASI01 tests
- `generateReport(campaignId)` — OWASP-mapped findings with severity and remediation

**API routes**: `POST /redteam/campaigns`, `GET /redteam/campaigns/:id`, `GET /redteam/findings`, `GET /redteam/report/:id`

**Dashboard**: `/red-team` — Campaign launcher, OWASP coverage matrix (pass/fail per ASI01–ASI10), finding severity breakdown, remediation checklist

**Revenue**: Security-buyer motion (CISO, not CLO). Standalone SKU: €2k/month per agent fleet tested. Bundle with Enterprise tier.

---

### Plugin System

Build a minimal plugin architecture allowing third-party integrations without modifying core code.

**New DB table**: `plugins` — `plugin_type` (webhook|evaluator|reporter|connector), `triggers[]` (audit event types), `endpoint_url`

**Plugin executor** (`lib/plugins/executor.ts`): Called from `AuditLedgerService.appendEvent()` after every write. Finds active plugins matching event type and fires webhooks (non-blocking, with retry).

**Five pre-built plugins to ship at launch**:
| Plugin | Trigger | Action |
|--------|---------|--------|
| Jira | S7 HITL exception created | Create Jira ticket; sync resolution bidirectionally |
| Datadog | Every 5 minutes | Stream certificate counts, anomaly rates, SLA metrics as custom metrics |
| PagerDuty | Critical S8 conflict, S14 critical anomaly, S15 emergency stop | Route to on-call engineer |
| Salesforce | S5 insurance claim filed | Create Salesforce Case; sync status updates |
| EU Regulatory Monitor | New regulation matches tenant's S13 frameworks | Auto-create compliance review task |

---

### SOUL Template Marketplace

A marketplace for pre-built Corporate SOUL configurations that can be purchased, activated, and customised.

**New DB tables**: `soul_templates` (catalog, with `price_usd` and Stripe integration), `soul_activations` (per-tenant activation history)

**Official templates to seed**:
| Template | Industry | Jurisdiction | Regulations | Price |
|---------|---------|-------------|------------|-------|
| EU Financial Services SOUL | Finance | EU/EEA | PSD2, MiFID II, GDPR | €2,000 |
| US Healthcare AI SOUL | Healthcare | US | HIPAA, FDA 21 CFR | €2,500 |
| UK Insurance SOUL | Insurance | UK | FCA, Lloyd's, ICO | €2,000 |
| Global Technology Startup SOUL | Technology | Global | SOC 2 basics | Free |
| US Federal / FedRAMP SOUL | Government | US | FISMA, NIST SP 800-53 | €5,000 |

**API routes**: `GET /soul-templates`, `POST /soul-templates/:id/activate` (Stripe-gated), `POST /soul-templates` (publish custom template — revenue share)

---

## Phase 8 — Long-Term Moat Classification

> This is a **strategic planning exercise**, not a build phase. Before committing engineering time to any of these, classify each item.

### Candidates to classify

For each item below, determine: **long-term moat** | **premium product expansion** | **services-led experiment** | **too early / low priority**

| Candidate | Key Question |
|-----------|-------------|
| Full insurance/underwriting micro-OS | Is TrustLayer the governance layer or the insurance product? |
| Non-human identity mesh (cross-org) | Can we federate NHI credentials across tenant boundaries? What's the trust model? |
| Agent identity mesh (agent federation) | Does A2A governance naturally extend to cross-company agent networks? |
| Regulatory explainability packs | Can S11 + S13 be packaged as standalone €5k products for specific regulators? |
| Data residency routing (beyond S10) | Physical data routing vs. just validation — is this infrastructure or governance? |
| Agent certification / trust scoring | Can TrustLayer issue a "TrustLayer Certified" badge for agents with clean audit history? |
| Cross-vendor policy enforcement | Can a policy written once apply across OpenAI + Anthropic + Mistral without per-vendor adapters? |
| Physical systems governance (beyond S15) | Surgical systems / autonomous vehicles — different liability model. Is this insurance territory? |
| FinOps for agents (beyond S9) | Full FinOps platform vs. governance guardrails. Where does TrustLayer stop? |
| Anomaly detection as standalone SIEM (beyond S14) | Is there a standalone product here that competes with Splunk/Datadog for agent observability? |
| Post-quantum cryptography archive | PQC migration for long-lived certificates — required for regulatory compliance by 2030. When? |

### Classification criteria

For each item, document:
1. **Why it matters** (or doesn't) for TrustLayer's core position as an AI Agent Action Firewall
2. **What dependency must exist** before building it (e.g. S9 must be live before "FinOps platform")
3. **What signal would justify moving it forward** (customer ask, regulatory mandate, competitive threat)
4. **Risk of NOT building it** (can a competitor use it to outflank TrustLayer?)

---

## Recommended Build Order

```
Phase 5.2 (Real auth/tenancy)          ← BLOCKING — no real customers without this
Phase 5.3 (API key auth in middleware)  ← BLOCKING — SDK unusable without this
Phase 5.4 (Plan limit enforcement)      ← Revenue leak until fixed
Phase 5.5 (Stripe payment_failed)       ← Revenue leak until fixed
Phase 5.6 (S5 state machine wiring)     ← Product completeness
Phase 5.7 (S8 endpoint split)           ← Security fix
  ↓
Phase 6 — in this order (each unlocks the next):
  S9 FinOps     ← Broadest enterprise appeal, easiest to demo
  S14 Anomaly   ← Needs S9 cost data for cost_spike detection
  S12 NHI       ← Builds on existing S6 identity work
  S13 Governance Hub ← Needs audit data from S9 + S12 in ledger
  S10 Sovereignty ← Standalone value, EU-market specific
  S11 Explainability ← Depends on S3 certificate volume being meaningful
  ↓
Phase 7 — after Phase 6 is generating revenue:
  S15 Physical AI   ← New vertical, requires dedicated sales motion
  S16 A2A Gateway   ← Depends on MCP/A2A adoption maturing
  S17 Red Teaming   ← Security buyer motion, different ICP from current
  Plugin System     ← Multiplies value of all existing modules
  SOUL Marketplace  ← Monetizes the S8 SOUL work already built
```

---

## Migration Numbers

| Phase | Migrations |
|-------|-----------|
| Already complete | 001–033 |
| Phase 5 | No new migrations needed |
| Module S9 FinOps | 034 (`agent_budgets`, `cost_events`) |
| Module S10 Sovereignty | 035 (`data_residency_policies`, `provider_regions`) |
| Module S11 Explainability | 036 (`decision_explanations`) |
| Module S12 NHI | 037 (`credential_rotations`, `agent_spawn_graph`) |
| Module S13 Governance Intel | 038 (`regulatory_frameworks`, `compliance_mappings`) |
| Module S14 Anomaly | 039 (`agent_baselines`, `behavioral_anomalies`) |
| Module S15 Physical AI | 040 (`physical_agents`, `physical_action_log`) |
| Module S16 A2A | 041 (`a2a_sessions`, `a2a_messages`) |
| Module S17 Red Teaming | 042 (`red_team_campaigns`, `red_team_findings`) |
| Plugin System | 043 (`plugins`) |
| SOUL Marketplace | 044 (`soul_templates`, `soul_activations`) |

---

## Competitive Position After All Phases

| Capability | Credo AI | TrustLayer (after Phase 7) |
|-----------|---------|--------------------------|
| Runtime block/allow | ❌ | ✅ S1/S6/S8 + Firewall |
| Cryptographic proof | ❌ | ✅ S3 Ed25519 |
| Multi-agent conflict prevention | ❌ | ✅ S1 |
| Corporate SOUL / ethics | ❌ | ✅ S8 |
| FinOps budget enforcement | ❌ | ✅ S9 |
| Data sovereignty validation | ❌ | ✅ S10 |
| Decision explainability | ❌ | ✅ S11 |
| NHI lifecycle (death certs) | ❌ | ✅ S12 |
| Regulation-mapped evidence | ✅ (top-down) | ✅ S13 (bottom-up, evidence-first) |
| Agent behavioural anomaly detection | ❌ | ✅ S14 |
| Physical AI governance | ❌ | ✅ S15 |
| A2A protocol governance | ❌ | ✅ S16 |
| Automated agent red teaming | ❌ | ✅ S17 |
| Plugin ecosystem | ❌ | ✅ |
| SOUL template marketplace | ❌ | ✅ |
