# TrustLayer — Phases Roadmap

> **Last updated:** 2026-04-09
> **Current status:** Phases 1–7 complete. Phase 8 (strategic classification) ongoing. Phase 9 (production hardening) in progress.

---

## Quick Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Core Firewall MVP | ✅ Complete |
| 2 | Approval & Workflow Integrations | ✅ Complete |
| 3 | API-First Productization | ✅ Complete |
| 4 | Enterprise Hardening | ✅ Complete |
| 5 | Critical Fixes & Production Hardening | ✅ Complete |
| 6 | New Governance Modules (S9–S14) | ✅ Complete |
| 7 | Advanced Platform (S15–S17 + Plugins + Marketplace) | ✅ Complete |
| 8 | Long-Term Moat Classification | 📋 Strategic (ongoing) |
| **9** | **Go-To-Market Hardening** | 🔴 In Progress |

---

## Phase 1–4 — Core Platform
All complete. See git history for implementation details.

---

## Phase 5 — Critical Fixes & Production Hardening ✅

| Item | Status | Notes |
|------|--------|-------|
| 5.1 Vercel Cron (Hobby plan fix) | ✅ | All crons changed to `0 * * * *` or daily |
| 5.2 Real Auth & Multi-Tenancy | ✅ | Supabase SSR auth, onboarding, middleware protection |
| 5.3 API Key Auth in Middleware | ✅ | SHA-256 hash lookup, sets `X-Tenant-Id` |
| 5.4 Plan Limit Enforcement | ✅ | 429 returned when `api_requests_monthly ≥ PLAN_LIMITS[tier]` |
| 5.5 Stripe `invoice.payment_failed` | ✅ | Downgrades to `past_due`, fires webhook notification |
| 5.6 S5 Insurance ↔ S3/S6/S7 wiring | ✅ | State machine calls S6 permission check, S3 certify, S7 HITL |
| 5.7 S8 MORALOS endpoint split | ✅ | `moral/soul/route.ts` (admin PUT) + `moral/route.ts` (agent eval) |
| 5.8 VersionMonitor fingerprint storage | ✅ | Reads/writes `model_version_fingerprints`, Welford stats |
| 5.9 CI/CD + E2E tests | ✅ | `.github/workflows/main.yml`, `e2e/dashboard.spec.ts`, `e2e/api.spec.ts` |
| 5.10 Post-Quantum Crypto (PQC) | ✅ | `pqc-signer.ts` stub + migration 045, `ENABLE_PQC` flag |

---

## Phase 6 — New Governance Modules ✅

| Module | Migration | Service | API Routes | Dashboard | Status |
|--------|-----------|---------|------------|-----------|--------|
| S9 Agent FinOps | 034 | ✅ | ✅ | ✅ `/finops` | ✅ Complete |
| S10 Data Residency | 035 | ✅ | ✅ | ✅ `/sovereignty` | ✅ Complete |
| S11 Explainability | 036 | ✅ | ✅ | ✅ `/explain` | ✅ Complete |
| S12 NHI Lifecycle | 037 | ✅ | ✅ | ✅ `/nhi` | ✅ Complete |
| S13 Governance Intel | 038 | ✅ | ✅ | ✅ `/compliance` | ✅ Complete |
| S14 Anomaly Detection | 039 | ✅ | ✅ | ✅ `/anomaly` | ✅ Complete |

---

## Phase 7 — Advanced Platform ✅

| Module | Migration | Service | API Routes | Dashboard | Status |
|--------|-----------|---------|------------|-----------|--------|
| S15 Physical AI | 040 | ✅ | ✅ | ✅ `/physical` | ✅ Complete |
| S16 A2A Gateway | 041 | ✅ | ✅ | ✅ `/a2a` | ✅ Complete |
| S17 Red Teaming | 042 | ✅ | ✅ | ✅ `/red-team` | ✅ Complete |
| Plugin System | 043 | ✅ | ✅ | ✅ `/plugins` | ✅ Complete |
| SOUL Marketplace | 044 | ✅ | ✅ | ✅ `/soul-marketplace` | ✅ Complete |
| MFA Page | — | — | — | ✅ `/account-settings/mfa` | ✅ Complete |
| PQC Migration | 045 | ✅ | — | — | ✅ Complete (stub, flag-gated) |

---

## Phase 8 — Long-Term Moat Classification (Strategic) 📋

For each candidate below, determine: **long-term moat** | **premium product expansion** | **services-led experiment** | **too early**

| Candidate | Recommendation |
|-----------|---------------|
| Full insurance/underwriting micro-OS | Premium product expansion — build only with 3+ insurance enterprise contracts |
| Cross-org NHI federation | Long-term moat — requires standards body participation (IETF/OpenID) |
| Agent certification / trust scoring | Long-term moat — "TrustLayer Certified" badge after 12+ months of audit data |
| Regulatory explainability packs (S11+S13 bundles) | Premium product — €5k standalone package per regulator type |
| Physical systems governance beyond S15 | Too early (surgical/automotive) — different liability model, different buyer |
| FinOps platform beyond S9 | Premium product — only if S9 standalone revenues justify deeper investment |
| Anomaly detection as standalone SIEM | Services-led experiment — pilot with 2 enterprise customers before productizing |
| PQC archive (full ML-DSA-65) | Long-term moat — mandatory before 2030 NIST deadline; begin when `@noble/post-quantum` stabilizes |

---

## Phase 9 — Go-To-Market Hardening 🔴 IN PROGRESS

These are the remaining gaps between "technically complete" and "deployable to paying enterprise customers."

### 9.1 — Dashboard Live Data ✅ Done
~~`src/app/page.tsx` had hardcoded metrics (14,204 / 42 / 3).~~
Fixed: now queries `audit_events`, `agents`, S1 conflict events live per tenant.
Zero-state guidance shown to new tenants with no agents registered.

### 9.2 — Plugin Executor Performance ✅ Done
~~Every ledger write triggered a DB query even for tenants with zero plugins.~~
Fixed: 60-second in-process cache skips the query when tenant has no active plugins.

### 9.3 — MFA QR Code XSS ✅ Done
~~`dangerouslySetInnerHTML` on QR code with no content validation.~~
Fixed: strict `/^<svg[\s>]/i` regex check before rendering as SVG.

### 9.4 — Admin Role Claim in Onboarding ✅ Done
~~`app_metadata.role` was never set; Corporate SOUL PUT endpoint was inaccessible to any user.~~
Fixed: `POST /api/v1/onboarding/set-admin-role` called after tenant creation; sets `{ role: 'admin', tenant_id }` via service-role client. Privilege-escalation guard: verifies user is actual tenant owner before updating.

### 9.5 — Pen Test (EXTERNAL — Action Required)
**What:** Independent security firm tests the full API surface, RLS policies, auth bypass, and privilege escalation paths.
**Who:** Cobalt.io (fastest), NCC Group (most credible for EU regulators), or Synack.
**Cost:** €5k–€15k.
**Timeline:** 3–4 weeks from engagement.
**Blocking:** No enterprise contract in a regulated industry without this.
**Pre-requisite:** Ensure 9.1–9.4 are deployed before engaging.

### 9.6 — SOC 2 Type II (EXTERNAL — Action Required)
**What:** AICPA-certified CPA firm audits security controls over a 6-month observation period.
**Start now:** Observation period begins on engagement — every month delayed = month later to certification.
**Platform:** Vanta, Drata, or Secureframe (automates 80% of evidence collection from Supabase/GitHub/Vercel).
**Auditor:** A-LIGN, Schellman, or Prescient Assurance.
**Cost:** €15k–€40k total.
**Timeline:** ~8 months to certification.
**Note:** TrustLayer's own S13 Governance Intel Hub can be used to track SOC 2 controls — use it.

### 9.7 — Data Processing Agreement / DPA (EXTERNAL — Action Required)
**What:** GDPR Art. 28 contract between TrustLayer (processor) and each EU customer (controller).
**Required:** Before any EU company can legally use TrustLayer with personal data in agent logs.
**Contents:** Purpose limitation, subprocessor list (Supabase/Vercel/Upstash/Stripe/Sentry), data residency, 72h breach notification, deletion on termination.
**Host at:** `trustlayer.io/legal/dpa`
**Cost:** €2k–€5k with privacy lawyer, or use IAPP template + review.
**Timeline:** 2 weeks.

### 9.8 — SLA Document (EXTERNAL — Action Required)
**What:** Public uptime and support commitment hosted at `trustlayer.io/legal/sla`.
**Commitments:**
- Uptime: 99.9% monthly (Vercel + Supabase both exceed this)
- P1 response: 15-minute acknowledgment
- P2 response: 1-hour acknowledgment
- Support: Starter email-only → Pro Slack → Enterprise dedicated Slack + phone
**Cost:** Free (draft internally, €500 for legal review).
**Timeline:** 1 week.

### 9.9 — Unit Tests for Core Services
**What:** vitest test files for the modules with the most financial/legal impact.
**Priority order:**
1. `lib/ledger/service.ts` — signature generation + PQC path
2. `lib/modules/s9-finops/service.ts` — budget calculation + model pricing
3. `lib/modules/s14-anomaly/service.ts` — Welford algorithm + z-score detection
4. `lib/modules/s5-insurance/state-machine.ts` — all 8 state transitions + FCRA thresholds
**Why:** Series A due diligence runs `npm test`. Zero test output is a yellow flag.

### 9.10 — PQC Full Activation
**What:** Replace `pqc-signer.ts` stub with real ML-DSA-65 signatures.
**Blocked on:** `@noble/post-quantum` reaching stable Dilithium65 API (or Node.js native quantum crypto).
**Action:** Monitor `@noble/post-quantum` releases. When API stabilizes: `npm install @noble/post-quantum`, replace stub body, update migration 045 comment.
**Do not market PQC until this is done.**

---

## Cron Endpoints (all configured in vercel.json)

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/sla-check` | Hourly | HITL SLA breach detection + escalation |
| `/api/cron/anomaly-check` | Hourly | S14 agent behaviour anomaly scan |
| `/api/cron/compliance-scan` | Daily 6am | S13 audit ledger → regulatory article mapping |
| `/api/cron/nhi-rotation` | Daily 2am | S12 credential rotation expiry enforcement |
| `/api/cron/baseline-update` | Daily 1am | S14 Welford baseline recalculation |

---

## Migration Index

| Migration | Tables | Status |
|-----------|--------|--------|
| 001–033 | Core platform tables | ✅ |
| 034 | `agent_budgets`, `cost_events` (S9) | ✅ |
| 035 | `provider_regions`, `data_residency_policies` (S10) | ✅ |
| 036 | `certificate_explanations` (S11) | ✅ |
| 037 | `credential_rotations`, `agent_spawn_graph` (S12) | ✅ |
| 038 | `compliance_frameworks`, `framework_controls`, `control_evidence` (S13) | ✅ |
| 039 | `anomaly_baselines`, `anomaly_events` (S14) | ✅ |
| 040 | `physical_agents`, `physical_action_log` (S15) | ✅ |
| 041 | `a2a_handshakes`, `a2a_signatures`, `a2a_sessions`, `a2a_messages` (S16) | ✅ |
| 042 | `red_team_campaigns`, `red_team_attacks` (S17) | ✅ |
| 043 | `plugins`, `plugin_executions` | ✅ |
| 044 | `soul_templates`, `soul_activations` | ✅ |
| 045 | `audit_events.pqc_signature` column | ✅ |

---

## Competitive Position

| Capability | Credo AI | Lakera | Protect AI | TrustLayer |
|-----------|---------|--------|-----------|-----------|
| Runtime block/allow firewall | ❌ | Partial | ❌ | ✅ S1/S6/S8 |
| Cryptographic provenance | ❌ | ❌ | ❌ | ✅ S3 Ed25519 |
| Multi-agent conflict prevention | ❌ | ❌ | ❌ | ✅ S1 |
| Corporate SOUL / ethics engine | ❌ | ❌ | ❌ | ✅ S8 |
| FinOps budget enforcement | ❌ | ❌ | ❌ | ✅ S9 |
| Data sovereignty validation | ❌ | ❌ | ❌ | ✅ S10 |
| Decision explainability (Art 13) | Partial | ❌ | ❌ | ✅ S11 |
| NHI lifecycle (death certs) | ❌ | ❌ | ❌ | ✅ S12 |
| Regulation-mapped evidence | ✅ (top-down) | ❌ | ❌ | ✅ S13 (bottom-up) |
| Agent behavioural anomaly detection | ❌ | ❌ | ❌ | ✅ S14 |
| Physical AI governance | ❌ | ❌ | ❌ | ✅ S15 |
| A2A protocol governance | ❌ | ❌ | ❌ | ✅ S16 |
| Automated agent red teaming | ❌ | ❌ | Partial | ✅ S17 |
| Plugin ecosystem | ❌ | ❌ | ❌ | ✅ |
| SOUL template marketplace | ❌ | ❌ | ❌ | ✅ |
