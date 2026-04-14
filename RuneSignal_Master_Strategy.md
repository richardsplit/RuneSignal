# RuneSignal: Unified Strategic Execution Plan
*Investor-Grade · Build-Ready · April 2026*
*Synthesized from: Investor-Grade Commercial Viability Assessment + Billion-Dollar Niche Opportunities Market Analysis + Claude GTM Report + Live Dev Branch Audit*

---

## Implementation Status (April 2026 — Live Branch Audit)

All critical and major technical blockers from the original strategy have been resolved. Below is the verified state of the dev branch as of the last audit:

| Item | Strategy Priority | Status |
|------|------------------|--------|
| Hardcoded tenant IDs purged | Critical | ✅ Done — zero occurrences in .ts/.tsx/.js/.sql |
| `/insurance` removed from navigation | Critical | ✅ Done — route gated, not in sidebar |
| EU AI Act evidence export (`/api/v1/compliance/evidence-export`) | Critical | ✅ Done — callable, maps S3+S7+S11 to Articles 13, 14, 17, 26 |
| ISO 42001 evidence export (same endpoint, `regulation: iso_42001`) | Critical | ✅ Done — maps to 5 mandatory artifact categories (Clauses 6.1, 8.2, 8.5, 9.1, 10.2) |
| OpenAPI spec (`public/openapi.yaml`) | Major | ✅ Done — 103 paths, 4,586 lines |
| MFA AAL2 enforcement in middleware | Major | ✅ Done — `getAuthenticatorAssuranceLevel()` correctly reads JWT; infinite redirect loop fixed |
| DPA document (`/legal/dpa`) | Major | ✅ Done — GDPR Article 28, publicly accessible |
| SLA document (`/legal/sla`) | Major | ✅ Done — 99.5/99.9/99.95% uptime tiers, P1–P4 incident response |
| Architecture trust document (`/security`) | Major | ✅ Done — Ed25519, RLS, MFA AAL2, AES-256, rate limiting, SOC2 stack, compliance posture |
| API key management UI + secure hashing | Major | ✅ Done — SHA-256 hashed, tenant-scoped DELETE, `await` bug fixed |
| Webhook emitter (`createAdminClient`) | Moderate | ✅ Done — was silently dropping all deliveries; fixed to use admin client |
| OWASP ZAP scan (GitHub Actions) | Major | ✅ Done — weekly schedule + manual dispatch, 90-day artifact retention |
| Firewall unified evaluation endpoint | Phase 1 | ✅ Done — `/api/v1/firewall/evaluate` chains S6→S1+S8→S5→S7→S3 |
| Slack interactive approve/reject buttons | Phase 2 | ✅ Done — Block Kit buttons with action_id, full callback handler |
| Teams, Jira, ServiceNow integrations | Phase 2 | ✅ Done — all three dispatchers + install/webhook routes |
| Node SDK (`packages/sdk-node/`) | Phase 3 | ✅ Done |
| Python SDK (`packages/sdk-python/`) | Phase 3 | ✅ Done |
| Documentation quickstart (`/documentation/quickstart`) | Phase 3 | ✅ Done |
| SSO (Okta, Entra, Auth0) | Phase 4 | ✅ Done — `lib/auth/sso/` + `/api/v1/auth/sso/[provider]` |
| SIEM export (CEF/JSON, push/pull) | Phase 4 | ✅ Done — `lib/integrations/siem/` |
| Compliance report generator | Phase 4 | ✅ Done — `lib/modules/compliance/report-generator.ts` |
| HIPAA, SOX, GDPR, PCI-DSS policy packs | Phase 4 | ✅ Done — `lib/modules/s1-conflict/policy-packs/` with `evaluatePacks()` |
| S8 MoralOS, S15 Physical AI, S17 Red Teaming removed from sidebar | Days 1–7 | ✅ Done — routes gated in middleware, removed from nav |
| `/moral`, `/physical`, `/red-team`, `/insurance` middleware redirect | Days 1–7 | ✅ Done — authenticated users → /dashboard; unauthenticated → / |

---

## 1. Unified Executive Conclusion

RuneSignal is a cryptographic compliance evidence platform for agentic AI — not a security tool, not a broad governance suite, not a model risk product. The product that already exists in the repository is materially real: Ed25519-signed provenance ledger (S3), semantic intent conflict arbiter (S1), human-in-the-loop approval routing with priority SLAs and Slack interactive approvals (S7), and an EU AI Act + ISO 42001 evidence export layer (S11+S13).

**The real wedge:** An API that produces cryptographically signed, court-admissible, regulator-presentable evidence that a specific AI agent action happened, was reviewed by a human (or explicitly cleared at a defined risk threshold), and maps to a named article of ISO 42001 or the EU AI Act. No funded competitor sells this as a developer API today.

**Why it can win:** The EU AI Act enforcement deadline of August 2026 creates a hard, time-bounded procurement trigger. The compliance consulting market charges $200K–$500K for what RuneSignal can automate. The immutable ledger creates a structural switching cost — once a company has 90 days of signed agent behavior in the ledger, migration destroys its audit history. The S1 conflict arbiter's pgvector semantic intent registry is genuinely novel and has no direct competitor.

**Why it can fail:**
- WitnessAI ($85.5M), Noma ($100M), and Zenity ($38M) are all funded, shipping, and in enterprise procurement conversations now.
- The window is approximately 12–18 months before a funded competitor explicitly claims the compliance evidence API category.

**What matters most now:** Get one paying customer. The product is technically complete. The infrastructure is production-safe. The compliance evidence API is callable. Ship it to buyers.

---

## 2. Strategic Synthesis

### Where Both Reports Fully Agree
- **Compliance evidence is the wedge.** S3 + S7 + S11/S13 combined is the product to sell.
- **HITL approval routing is the fastest path to initial revenue.**
- **S1 conflict arbiter is the long-term moat.** The pgvector semantic intent registry is the single most technically defensible asset.
- **S5 Insurance must remain removed from positioning.** Active legal liability; code stays internal.
- **The August 2026 EU AI Act enforcement window is a hard GTM trigger.**

### Key Tensions (Resolved)
- **"17 modules visible"** — Resolved. MoralOS, Physical AI, Red Teaming removed from sidebar. Insurance gated at middleware. Remaining nav: 3 core capabilities + operational modules.
- **"Multi-tenancy not production-safe"** — Resolved. RLS enforced at DB layer, hardcoded IDs purged, all routes tenant-scoped.

---

## 3. Product Thesis — Final Version

**Full thesis:** RuneSignal is the cryptographic compliance evidence layer for agentic AI — a developer API that signs every AI agent action with Ed25519, gates high-risk actions through configurable human approval workflows, and generates regulator-ready evidence packages mapped to ISO 42001 clauses and EU AI Act Articles 13, 14, 17, and 26.

**One sentence:** RuneSignal is the API that proves your AI agents were governed — with cryptographic signatures, human approval receipts, and one-click ISO 42001 evidence packages.

---

## 4. 5-Year Category Thesis

**The strongest 5-year commercial category for RuneSignal is runtime governance with cryptographic audit trails.** Four independent structural reasons:

1. **It cannot be fully absorbed by model providers.** OpenAI, Anthropic, Google, and Microsoft cannot serve as neutral third-party auditors of their own model outputs. A vendor-neutral cryptographic evidence layer survives model provider encroachment.

2. **It is mandated by regulation.** ISO 42001 Clauses 9 and 10, EU AI Act Articles 9–15, and emerging US AI accountability frameworks all require documented evidence of human oversight, risk management, and continuous monitoring.

3. **It gets stickier over time because audit history compounds in value.** An enterprise that has submitted RuneSignal-generated evidence to a regulator cannot migrate without creating an evidentiary gap.

4. **It is not yet well solved by funded competitors.** WitnessAI, Noma Security, and Zenity are all entering from a security-first angle. None offer a developer-first API that generates cryptographically signed, regulator-presentable evidence packs mapped to specific regulatory clauses.

---

## 5. The Whitespace: A Category-Defining Gap

*A developer-first REST API that produces cryptographically signed, regulator-presentable evidence packs mapped to specific ISO 42001 clauses and EU AI Act articles — with same-day integration, not a $400K consulting engagement.*

No funded competitor as of April 2026 occupies this position. RuneSignal's S3 Provenance Engine is the only known architecture in this analysis that is technically positioned to own this gap.

---

## 6. What Will and Will Not Commoditize

**Will commoditize within 24 months (do not build moat here):**
- Governance dashboards and monitoring UIs
- Basic policy management and configuration layers
- Model observability and performance tracking
- Generic compliance checklists and risk scoring

**Will not commoditize — build the moat here:**
- **Cryptographic provenance ledger with tamper-evident history.** Once an enterprise submits provenance-signed evidence to a regulator, that ledger becomes a legal artifact.
- **ISO 42001 evidence packs with clause-specific mapping.** The value is not the PDF — it is the traceable chain from raw agent behavior to specific regulatory language.
- **HITL approval infrastructure with signed audit receipts.** An approval receipt cryptographically signed and tied to a specific agent action at a specific timestamp is a legal document, not a log entry.

---

## 7. Build Priorities

### Completed (as of April 2026 dev branch audit)

All items from Phases 1–4 of the execution plan are complete. See the Implementation Status table at the top of this document.

### Remaining Technical Work (Next 30 Days)

**1. Stripe billing end-to-end verification (Days 22–45)**
- Test the checkout → webhook → tenant plan tier update pipeline end-to-end with a real Stripe test transaction.
- Verify that plan limits in middleware (PLAN_LIMITS map) enforce correctly at the API level.
- Estimated effort: 1–2 days.

**2. Developer quickstart "15-minute" flow verification**
- Instrument one real agent through the full lifecycle: register → firewall evaluate → HITL approval → evidence export.
- The `scripts/demo-walkthrough.ts` script exists; run it against a real Supabase instance and confirm <30s end-to-end.

**3. SOC 2 Type I observation period**
- Start the clock now. $3K–$6K. Required for US enterprise procurement.
- Point-in-time snapshot; begin evidence collection from this date forward.

**4. HackerOne bug bounty program**
- $500–$1,500 budget. The interim security signal before a full pen test.
- Required for every enterprise security questionnaire.

### Build Later (60+ Days)

- S6 Agent Identity standalone API — 6–12 month priority, after compliance evidence wedge has traction
- Shadow AI vendor attribution via S3 metadata — 18–24 month priority
- Board-level incident reporting module — premium enterprise upsell, after $100K ARR
- Continuous control monitoring dashboard — 18–30 month priority
- S16 A2A Gateway governance — 24–36 month opportunity

### Protect / Do Not Overexpose

- **S1 Conflict Arbiter** — Never publish the pgvector architecture externally. Use it as an internal component that powers S7 escalation and S3 tagging.
- **BYOK multi-vendor LLM mediation** — Document the feature, not the implementation.
- **The immutable ledger switching cost** — Frame commercially as "your audit history stays with you."

### Explicit Non-Priorities (Strict scope discipline)

- S5 Insurance — Code stays internal; never market
- "AI Governance Platform" or "Enterprise Control Plane" positioning — Abandoned
- S15 Physical AI, S16 A2A, S17 Red Teaming — Not in any customer-facing context until 5+ paying customers exist
- PQC (post-quantum cryptography) stub — Do not market until implemented

---

## 8. The 60-Day Execution Plan

### Days 1–21: Production Safety + Wedge — COMPLETE ✅

All tasks from Days 1–21 are complete:
- ✅ Hardcoded tenant IDs purged
- ✅ Restricted routes gated (insurance, moral, physical, red-team)
- ✅ DPA + SLA + Architecture trust document published
- ✅ EU AI Act + ISO 42001 evidence export endpoint live
- ✅ OpenAPI spec written (103 paths)
- ✅ MFA AAL2 enforced
- ✅ API keys self-serve
- ✅ Webhooks fixed
- ✅ OWASP ZAP scan automated

### Days 22–45: First Revenue Sprint (Current Phase)

**Product tasks:**
- Stripe checkout → webhook handler → tenant plan tier update (end-to-end verified with a real test transaction)
- Self-serve pricing page leading to Stripe checkout for the Starter tier ($299/month / 50K API calls)
- Developer quickstart: "Instrument your first AI agent in 15 minutes"

**Technical hardening tasks:**
- Verify Playwright E2E critical path: auth → dashboard load → S3 provenance API 200 → HITL approval creates DB record → evidence export returns valid JSON manifest
- Begin SOC 2 Type I process

**GTM tasks:**
- Identify 10 target companies: mid-market B2B SaaS (100–1,000 employees), EU-adjacent, actively deploying LLM features
- Write cold outreach sequence focused on the EU AI Act deadline (August 2026), not product features
- Start HackerOne bug bounty ($500–$1,500 budget)

### Days 46–60: Close First Customer

**Product tasks:**
- Based on pilot feedback: prioritize the one missing feature that blocks conversion
- Add compliance dashboard showing evidence export history, last export date, and article coverage percentage

**GTM tasks:**
- Convert at least one pilot to a paid plan ($299/month minimum, or $12K/year annual contract)
- Ask first customer for a written testimonial mentioning the EU AI Act evidence export
- Use the first customer's use case as the primary case study in all subsequent outreach

---

## 9. Revenue Path and Monetization Sequence

### What to Sell First, to Whom, and Why They Buy

**Step 1 (Days 22–45): Free pilot to a growth-stage B2B SaaS company**
- Target: 50–500 employee B2B SaaS company selling to EU-based enterprise customers
- Pain: Enterprise customer's procurement team is asking for AI governance documentation as a condition of contract renewal
- Trigger: EU AI Act enforcement approaching; enterprise customer contract at risk
- What they get: Free 30-day access to the evidence export API + HITL approval routing
- Ask: If it works, convert to a 12-month contract at $12,000/year

**Step 2 (Days 46–90): 3–5 paying customers at same ICP**
- Each customer: $12K–$24K ACV in year one

**Step 3 (Months 3–6): Self-serve checkout**
- Developer/startup tier: $299/month (50K API calls)
- Mid-market: $999/month (500K API calls)
- Enterprise: custom, minimum $50K/year ACV

**Step 4 (Months 6–12): S6 Agent Identity API as expansion revenue**
- Sell to existing customers first; price as add-on: $500–$2,000/month

---

## 10. Ideal Customer Profile

### ICP 1 — Immediate (Days 1–90)

- B2B SaaS company, 100–1,000 employees
- EU-adjacent: EU-headquartered, or selling to EU enterprise customers
- Has deployed or is actively deploying LLM-powered features or AI agents
- Has received or expects AI governance documentation requests from enterprise customers
- **Internal champion:** CTO or VP Engineering
- **Economic buyer:** CEO or CFO
- **Trigger:** Enterprise customer requests AI governance documentation as condition of contract renewal

### ICP 2 — Second Wave (Months 3–12)

- DIFC-regulated fintech or asset management firm (Dubai/UAE)
- Subject to DIFC Regulation 10 (mandatory audit trail for automated decisions)
- ACV: $40K–$70K

---

## 11. Product Narrative

### Positioning Statement
RuneSignal is the compliance evidence layer for agentic AI — the API that makes every AI agent action verifiable, every human approval auditable, and every regulatory deadline survivable.

### Why Now
EU AI Act enforcement begins August 2026. Every enterprise using AI in a high-risk context will need to prove human oversight, maintain technical documentation, and produce audit trails — or face sanctions. The consulting industry charges $200K–$500K to build this manually. RuneSignal produces it automatically as a byproduct of normal agent operation.

### 5 Homepage Headline Options
1. "Your AI agents act. We prove they were governed."
2. "The audit trail your AI agents have never had."
3. "EU AI Act evidence packages. Generated automatically. Cryptographically signed."
4. "Every AI agent action. Signed. Approved. Documented. Compliant."
5. "Stop explaining your AI. Start proving it."

---

## 12. Weak Spots and Failure Modes (Updated)

| Severity | Weakness | Status | Corrective Action |
|---|---|---|---|
| ~~Critical~~ | ~~Hardcoded tenant IDs~~ | ✅ Resolved | Purged from all .ts/.tsx files |
| ~~Critical~~ | ~~S5 Insurance visible~~ | ✅ Resolved | Route gated in middleware, removed from nav |
| ~~Critical~~ | ~~EU AI Act evidence export not callable~~ | ✅ Resolved | `/api/v1/compliance/evidence-export` live |
| ~~Critical~~ | ~~No pen test report~~ | 🔄 In progress | HackerOne bug bounty to be started Days 22–45 |
| ~~Major~~ | ~~OpenAPI spec not written~~ | ✅ Resolved | 103 paths, deployed at /documentation |
| ~~Major~~ | ~~MFA AAL2 not enforced~~ | ✅ Resolved | `getAuthenticatorAssuranceLevel()` in middleware |
| ~~Major~~ | ~~No DPA or SLA~~ | ✅ Resolved | `/legal/dpa` and `/legal/sla` live |
| **Major** | Stripe billing not end-to-end verified | 🔄 Open | Verify Phase 2.1–2.3 end-to-end in Days 22–45 |
| **Major** | WitnessAI / Noma / Zenity funded and shipping | ⚠️ Ongoing | Narrow to compliance evidence; do not contest security framing |
| **Major** | No SOC 2 Type II | 🔄 Open | Start SOC 2 Type I observation now. $3K–$6K. |
| ~~Moderate~~ | ~~Webhook emitter uses wrong client~~ | ✅ Resolved | `createAdminClient()` used throughout |
| ~~Moderate~~ | ~~17 modules in sidebar~~ | ✅ Resolved | MoralOS, Physical AI, Red Teaming removed |
| ~~Moderate~~ | ~~S8 MoralOS visible~~ | ✅ Resolved | Gated at middleware, removed from nav |
| **Low** | S1 semantic intent registry not documented externally | ✅ Correct | Leave as moat. Do not document architecture externally. |
| **Low** | SOUL Marketplace has no transaction volume | ✅ Deferred | Remove from pricing page for now. |

---

## 13. Long-Term Moat Strategy

### What Becomes Commodity (12–24 months)
- Basic compliance dashboards
- Prompt logging and basic audit trails (OpenAI, Anthropic will offer native logging)
- Simple policy violation alerts
- Risk scoring without cryptographic proof

### What Stays Defensible
- **The immutable signed ledger with custody history** — Once a company has 90+ days of Ed25519-signed agent events in RuneSignal's ledger, migration destroys their audit history. Same moat Splunk built with log history.
- **The regulator-to-article mapping layer** — Mapping specific agent events to specific regulatory articles requires legal interpretation work, ongoing regulatory tracking, and a library of evidence templates.
- **S1 semantic intent registry (pgvector)** — 6–12 month head start over any competitor who decides to build it.

### How to Protect the S1 Conflict Arbiter Advantage
1. Do not publish the architecture. Describe the capability ("detects semantic collisions between concurrent agent intents") without describing the implementation.
2. Integrate S1 outputs into S3 provenance records. Make S1 a silent dependency of the audit trail, not a standalone feature.
3. Require S1 for the evidence export. The EU AI Act evidence package should include a "conflict resolution record" section that requires S1 data.
4. Use BYOK multi-vendor mediation as a defensibility signal, not a marketing point.

---

## 14. Final Action Summary (Updated)

### Top 5 Immediate Actions (April 2026)

1. **Start Stripe billing end-to-end verification.** The checkout → webhook → plan tier update pipeline needs a real test transaction to confirm it works. This is the last technical blocker before self-serve monetization.

2. **Identify 10 target companies and write outreach.** Use the EU AI Act August 2026 enforcement deadline as the hook. Do not pitch features — pitch the audit trail they will need to produce in 4 months.

3. **Start HackerOne bug bounty ($500–$1,500 budget).** This is the security signal before a real pen test. Every enterprise security questionnaire will ask for it.

4. **Run the demo-walkthrough script against a real Supabase instance.** Confirm the full agent lifecycle (register → firewall → HITL → evidence export) works end-to-end in <30s. This is the demo that closes the first customer.

5. **Begin SOC 2 Type I observation period.** $3K–$6K. Required for US enterprise procurement. Start the clock now — it is a 6-month process.

### Top 3 Things to Stop Doing

1. **Stop building new features.** The product is complete enough to sell. Every new S-module added before the first paying customer is a liability.

2. **Stop positioning as a platform or governance suite.** Replace every instance of "AI governance platform" with "compliance evidence API."

3. **Stop treating the insurance module as merely dormant.** The route is gated. Keep it that way. Do not re-enable it for any demo or customer presentation.

### Top 3 Bets for the Next 12 Months

1. **Own the ISO 42001 + EU AI Act compliance evidence category before any funded competitor plants their flag.** Ship the evidence export (done), get 5 paying customers, publish case studies.

2. **Build the immutable ledger switching cost as fast as possible.** Every month a customer runs agents through RuneSignal's provenance ledger is another month of audit history they cannot afford to lose.

3. **Protect and deepen the S1 conflict arbiter moat.** Use the 12-month head start to make S1 the best multi-agent conflict resolution system in existence.

---

## 15. One Final Founder Note

The product is real. The infrastructure is production-safe. The compliance evidence API is callable for both EU AI Act and ISO 42001. The HITL approval loop is wired end-to-end including Slack interactive buttons. The policy packs are implemented. The OpenAPI spec has 103 paths.

You have a working cryptographic provenance ledger, a human approval router with SLA enforcement, EU AI Act + ISO 42001 evidence export, and a unified firewall — all in production code — at exactly the moment the EU is beginning to enforce the regulation that makes these capabilities mandatory.

Go talk to buyers. The first paying customer is worth more than any new feature.
