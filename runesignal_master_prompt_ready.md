# RuneSignal — Ready-to-Use Master Prompt

```md
SYSTEM ROLE:
You are an elite combination of:
- Principal Product Strategist
- Enterprise Packaging & Pricing Architect
- AI Infrastructure Commercialization Lead
- Technical GTM Operator
- Systems Architect for regulated AI platforms
- Competitive Strategy Analyst

Your task is to take the source memo below as the authoritative source of truth and turn it into a high-conviction commercialization and execution blueprint for RuneSignal.

Your objective is not to invent a new company from scratch.
Your objective is to determine how RuneSignal should be packaged, extended, positioned, and monetized based on what is already built and what still needs to be added.

## Core Thesis You Must Preserve
- RuneSignal is already roughly 70% of the Agent Evidence Plane.
- The three unicorn-style products are not three separate greenfield products.
- They are primarily repackaging + extension layers on top of existing modules already shipped inside RuneSignal.
- The strategic question is not “how do we build all of this from zero?”
- The strategic question is “how do we package, price, position, sequence, and monetize it?”

## Source Facts You Must Use
Treat the source memo as explicit ground truth and incorporate it into your reasoning and output.

## Non-Negotiable Architecture / Packaging Rules
You must preserve these rules:
1. Runtime stays one product/platform because the cryptographic and governance guarantees require signing, identity, HITL, explainability, anomaly, and residency to remain unified.
2. Commercial packaging must be split because the buyers, budgets, urgency, and pricing shapes differ.
3. Evidence Packs and Decision Ledger should be sold as metered add-ons / API packs.
4. Agent Passport Registry should become a separate SaaS / network-effect trust layer over time.
5. Do not propose splitting the runtime into disconnected products if doing so breaks the integrity of the Agent Evidence Plane.

## What You Must Produce
Produce a rigorous, board-level but execution-ready output with the following sections:

1. Executive Thesis
2. Product Mapping Table
3. Commercial Architecture Decision
4. SKU and Pricing Blueprint
5. Moat Analysis
6. App / API / Package Translation
7. Execution Roadmap
8. GTM Narrative by Buyer
9. Highest-Leverage Immediate Moves
10. Risks / Assumptions / Missing Pieces
11. Final Recommendation

## Mandatory Output Requirements
- Explicitly map all 3 products to what is already shipped vs what is missing.
- Explicitly preserve the tier logic: Free / Developer, Core, Evidence Pack Add-On, Decision Ledger & Reversibility API Pack, Agent Passport Registry, Enterprise Sovereign, Insurance Carrier OEM.
- Explicitly include the buyer logic and budget separation.
- Explicitly include routes, packages, API endpoints, and metered billing primitives.
- Explicitly include the insurer / reinsurer angle.
- Explicitly include standards-body participation for the registry moat.
- Explicitly include outcome back-labeling + reversibility as a core strategic loop.
- Be decisive and commercially sharp.
- Avoid generic startup clichés and generic AI wrapper language.

## Mandatory Self-Revision Step
Before finalizing your answer:
1. Run an internal coverage audit against the source memo.
2. Check whether you included all of the following:
   - Evidence Packs mapping + missing gaps
   - Registry mapping + network-effect moat
   - Decision Ledger mapping + reversibility loop
   - unified runtime / separate packaging principle
   - buyer-specific packaging
   - tier structure
   - new routes
   - new packages
   - API endpoints
   - metered billing primitives
   - moat logic
   - immediate execution steps
3. If anything is missing, revise the answer before outputting it.
4. At the end, add a short Coverage Check section stating whether every major memo component was incorporated.

## Source Memo
How the 3 Unicorn Products Map Into RuneSignal
The very short answer: RuneSignal already is ~70% of the "Agent Evidence Plane." The three products from §4 of the unicorn report are not new pillars you need to build — they are repackaging + extension layers on top of modules you have already shipped (S3, S6, S7, S11, S12, S13, S16, plugins, SOUL marketplace). The strategic question is not "how do I build them" but "how do I package, price, and position them."

Below: (1) how each product maps to what is already in the repo, (2) what gaps remain, (3) whether this should be one combined product, separate SKUs, or an API pack, (4) a concrete packaging & pricing blueprint you can ship.

1. Mapping the 3 Unicorn Products to RuneSignal's Existing Modules
Product 1 — Evidence Packs (insurance- and regulator-grade signed decision artefacts)
This is almost entirely already built inside RuneSignal.

Unicorn-product requirement	Already shipped in RuneSignal	Gap to close
Cryptographic signing of every decision	S3 Provenance Engine — Ed25519 signing of every agent action; immutable audit ledger	None. PQC (ML-DSA-65) stub exists behind ENABLE_PQC flag — activate once @noble/post-quantum stabilizes
Context + provenance attached to each packet	S3 hashes LLM inputs, outputs, system prompts	Add explicit "context-packet" wrapper: source list + retrieval timestamps + policy version hash
Identity chain	S6 RS256 JWTs + agent registration	None
Policy version pinning	S13 Governance Intel Hub (framework controls + evidence mapping, migration 038)	Add policy-version snapshot hash per decision
Permissions check at query time	S6 strictly-typed tool permission scopes	None
Reasoning chain (prospective, not post-hoc)	S11 Explainability (migration 036, certificate_explanations)	None — already prospective by design
Human-oversight trigger	S7 HITL Ops Routing + Slack + SLA tracking	None
Annex-IV / SR 11-7 / SOC 2 template export	S13 Governance Intel — "regulation-mapped evidence" (bottom-up)	Pre-certify templates with 1 notified body (TÜV/DNV/BSI) + 1 reinsurer
Append-only, tamper-evident ledger	S3 audit ledger + PQC-ready signature column (migration 045)	None
10-year retention (EU AI Act Art. 12)	Supabase + S10 Data Residency (migration 035)	Add immutable cold storage tier + retention policy UI
What this is, in one line: you already ship Evidence Packs as a technical artefact. What you are missing is the go-to-market rebrand from "compliance evidence package (S11+S13)" → "RuneSignal Evidence Pack™ — the insurance-grade, regulator-accepted record of every autonomous decision, signed and Annex-IV-ready."

Product 2 — Agent Passports + Cross-Org Trust Registry
~50% already built. The skeleton exists; the network layer is the expansion.

Unicorn-product requirement	Already shipped	Gap to close
Signed agent identity (SPIFFE-style)	S6 Identity & Permissions — RS256 JWT credential issuance	Migrate to SPIFFE-compatible SVID format for cross-org interop
Capability attestation	S6 strict tool-permission scopes	Add capability manifest export in a standard format (W3C VC or OpenID AgentID when finalised)
Reputation / incident history	S14 Anomaly Detection + S3 audit ledger + S17 Red Teaming campaigns	Aggregate per-agent scorecard; publish signed reputation tokens
A2A cross-org handshake	S16 A2A Gateway (migration 041 — a2a_handshakes, a2a_signatures, a2a_sessions, a2a_messages)	Already there. Add federation protocol + directory service
NHI lifecycle + death certs	S12 NHI Lifecycle (migration 037, credential_rotations, agent_spawn_graph)	None
Cross-org directory / registry	❌ not built	Build: neutral registry.runesignal.io with DID/VC publishing, reputation, revocation lists
Standards-body participation	Phase 8 roadmap flags this as "long-term moat — requires IETF/OpenID"	Join IETF WIMSE, OpenID AgentID WG, CSA Agentic Trust Framework
The product you don't yet have is the neutral registry — a runesignal.io/registry service where agents are published, verified, revoked, and reputation-scored. This is the network-effect flywheel that turns RuneSignal from "a tool my company uses" into "the DNS/VeriSign of agents."

Product 3 — Decision Ledger + Reversibility Engine
~60% already built. The ledger is there; the outcome back-labeling and reversibility workflow are the new surface.

Unicorn-product requirement	Already shipped	Gap to close
Append-only decision ledger	S3 audit ledger	None
Anomaly detection → kill-switch	S14 Anomaly Detection (migration 039, Welford z-score)	Wire anomaly → automated action quarantine
Forensic replay "why did agent X do this"	S11 Explainability + S3 ledger	Add replay UI and reasoning-chain diff
Outcome back-labeling (accepted / rejected / reversed / litigated)	❌ Only HITL acceptance is tracked via S7	Build: outcomes table that accepts webhook callbacks from downstream systems (Jira, ServiceNow, insurance claims) to label decisions weeks/months later
Insurance claims evidence export	S13 Governance Intel mapping	Add "Insurance Claim Evidence Pack" template (separate from regulator pack)
FinOps / budget guardrails	S9 Agent FinOps (migration 034)	None
Self-improving loop on outcomes	Plugin system + SOUL marketplace (migrations 043, 044)	Build: outcome-to-policy feedback — take back-labeled outcomes and auto-propose SOUL / S13 control tightening
Reversibility / compensation workflows	❌ not built	Build: reversal orchestrator (refund, revoke-access, rollback-deploy, retract-filing) linked to each decision
The single most important new thing to build here is Outcome Back-Labeling + Reversibility — because that is what converts the Decision Ledger from "an archive" into a compounding training dataset insurers and regulators will pay per-query to access. It is also the real "self-improving context" loop you were looking for.

2. Should These Be One Combined Product, Separate Products, or an API Pack?
Short answer: Core runtime stays one product. Evidence Packs and Decision Ledger become metered API packs sold as add-ons. Agent Passport Registry becomes a separate, eventually network-effect SaaS (the long-term moat).

Here is the logic and the packaging you should ship.

The architecture decision
RuneSignal's runtime (S3 + S6 + S7 + S11 + S12 + S13 + S14 + S16) is one tightly-coupled system — it must stay one platform because every decision must flow through signing, identity, HITL, explainability, residency, and anomaly simultaneously. Splitting the runtime would break the cryptographic guarantee.

But commercial packaging should be separated, because each of the three "unicorn products" has a different buyer, a different budget, a different sales cycle, and a different pricing shape:

Product	Primary buyer	Budget	Pricing shape	Sales cycle
Runtime platform (RuneSignal Core)	CIO / Platform Eng / CISO	IT / Security	Per-tenant seat + action volume	3–6 mo
Evidence Packs	General Counsel / Head of AI Risk / CRO	Risk / Legal / Insurance	Metered per signed Pack + retention tier	2–4 mo (forced by EU AI Act)
Agent Passport Registry	Enterprise + ecosystem (counterparties)	Platform / trust	Per-passport + per-verification	Consortium — 12+ mo but network-effect
Decision Ledger / Reversibility	Head of AI Ops + CRO + General Counsel	Risk + Ops	Per-API-call forensic queries + retention tier	2–3 mo add-on
Selling them as one bundle means you miss three different budgets and three different urgency triggers.

Recommended SKU structure (ship this)
Tier 0 — Free / Developer

1 tenant, 10K actions/month, 30-day retention, no Evidence Packs, no A2A.

Purpose: adoption + hobby integration. Top-of-funnel.

Tier 1 — RuneSignal Core (€1,500 – €6,000 / month base)

Full runtime: S1/S3/S6/S7/S8/S9/S10/S14 modules.

Up to 2M agent actions/month, rolling 90-day audit ledger.

Slack HITL, anomaly detection, FinOps budgets.

Target buyer: Platform Eng + CISO at mid-market enterprises.

Tier 2 — Evidence Pack Add-On (metered: €0.05 – €0.50 per signed Pack)

Unlocks S11 Explainability + S13 Governance Intel Hub + Annex-IV / SR 11-7 / SOC 2 / HIPAA template exports.

Signed, append-only, 10-year cold-storage retention tier.

Priced per signed Evidence Pack, volume-tiered. Regulated enterprise hitting 1–5M decisions/yr = €50K–€1M ARR on top of Core.

Target buyer: General Counsel + CRO. Forced by EU AI Act Art. 12 (Aug 2, 2026).

This is your usage-based revenue flywheel — the Snowflake/Datadog shape of the business.

Tier 3 — Decision Ledger & Reversibility API Pack (€15K – €150K ACV + per-query metering)

S14 + S17 + new Outcome Back-Labeling + Reversibility Orchestrator.

Forensic replay API (per-query priced), outcome-webhook ingestion, automated reversal workflows.

Target buyer: Head of AI Ops + CRO. Upsell after a customer has a first material incident.

Tier 4 — Agent Passport Registry (€25K – €500K ACV + per-verification fee)

S6 + S12 + S16 + new public registry.

Each agent gets a signed Passport; counterparties verify via API.

Federated, consortium-anchored. This is the long-term VeriSign-style moat.

Network-effect pricing: low subscription, per-verification metering.

Tier E — Enterprise Sovereign

Dedicated tenant, bring-your-own-HSM, PQC signatures activated (migration 045), EU-only data residency (S10), dedicated CSM + Slack, custom Annex-IV template co-signed by notified body.

€250K – €2M ACV.

Target buyer: top-50 bank, insurer, pharma, defense contractor.

Tier I — Insurance Carrier OEM

Reinsurer / carrier licenses RuneSignal embedded into their AI-liability policy.

Carrier pays platform fee + revenue-share per insured agent.

This is the unique angle from the unicorn report — sell into the insurer and they push adoption across their book of business. Phase 8 roadmap explicitly flags "insurance/underwriting micro-OS" as a premium expansion once 3+ contracts are signed.

One-page buyer matrix (how a prospect picks)
text
             +----------------------------------------------------+
             |           What do you need to prove?               |
             +----------------------+-----------------------------+
             | "We control agents"  | "We can defend every        |
             |                      |  decision in court"         |
             +---------+------------+-------------+---------------+
"Just us"    | Core    | Core + Evidence Packs   | Core + ELL     |
             |         |                          | + Reversibility|
-------------+---------+--------------------------+----------------+
"Us + our    | Core +  | Core + Evidence Packs +  | Core + all     |
 partners"   | Registry| Registry                 | four add-ons   |
             |         |                          | (Enterprise)   |
-------------+---------+--------------------------+----------------+
3. What the Product Actually Looks Like in the App
Navigation (extends existing dashboard routes you already have)
Existing in the repo: /finops, /sovereignty, /explain, /nhi, /compliance, /anomaly, /physical, /a2a, /red-team, /plugins, /soul-marketplace. Add:

/evidence — Evidence Pack Studio. Lists every signed Pack, filter by regulator (EU AI Act, SR 11-7, HIPAA, SOC 2, ISO 42001), export as zipped bundle with hash manifest.

/evidence/templates — template marketplace pre-signed by notified bodies; customers pick and customize.

/ledger — Decision Ledger explorer: replay any decision, see full reasoning chain, see outcome labels, "reverse this action" button chained to reversal orchestrator.

/ledger/outcomes — incoming webhook ingest for Jira, ServiceNow, insurance-claims, litigation outcomes; attach to ledger entries.

/registry — Passport Studio: publish your agents, manage revocation, issue capability attestations, see your reputation score.

/registry/browse — directory of counterparty agents you can trust/accept.

/insurance — Insurance Export: one-click generate Carrier-Ready Evidence Pack (different template than regulator pack; includes loss-event vs no-loss-event sampling).

New packages inside /packages (monorepo already set up)
@runesignal/evidence-packs — template engine + hash-manifest builder + export pipeline.

@runesignal/registry-client — SDK for publishing/verifying Agent Passports.

@runesignal/ledger-replay — forensic replay + outcome-ingest API client.

@runesignal/reversibility — reversal action plugins (refund, revoke-access, rollback, retract).

API surface (additions)
text
POST   /api/v1/evidence/packs                 # generate signed pack
GET    /api/v1/evidence/packs/:id             # retrieve
POST   /api/v1/evidence/packs/:id/export      # export in chosen regulator format
POST   /api/v1/ledger/outcomes                # webhook ingest — back-label decision
POST   /api/v1/ledger/replay/:decisionId      # forensic replay (metered)
POST   /api/v1/ledger/reverse/:decisionId     # reversibility orchestrator
POST   /api/v1/registry/passports             # publish agent passport
POST   /api/v1/registry/passports/:id/verify  # counterparty verification (metered)
POST   /api/v1/registry/passports/:id/revoke  # revocation
GET    /api/v1/registry/passports/:id/reputation
POST   /api/v1/insurance/claim-pack           # carrier-ready export
Stripe wiring (extend existing Stripe setup)
Add metered products on top of your existing PLAN_LIMITS enforcement:

evidence_pack_signed — €0.05–€0.50 per pack, volume-tiered.

ledger_replay — €0.10–€1.00 per forensic replay query.

registry_verification — €0.02–€0.20 per counterparty verification.

passport_issued — one-off fee per agent passport issued.

Your existing invoice.payment_failed handler already covers the downgrade path.

4. Why This Packaging Wins the Unicorn Argument
Three different budgets, not one. IT, Legal/Risk, and Ops each have independent purchase authority — you cannot reach €100M ARR from IT budget alone.

Forced usage-based revenue. Evidence Packs are metered per signed decision. One regulated enterprise running 5M decisions/yr at €0.10 = €500K recurring on top of platform ACV. This is the Snowflake/Datadog pricing shape at the exact moment when the EU AI Act makes signed decision logs legally mandatory.

Network-effect moat lives in the Registry, not in the runtime. Runtime is replicable; a neutral registry with consortium backing is not. Phase 8 of the roadmap already classifies it as the "long-term moat".

The Decision Ledger + Outcome Back-Labeling is the actual "self-improving context broker." Outcomes feed back into SOUL policies and S13 control tightening — closing the loop without relying on fuzzy "retrieval recipes." This is the moat the original pitch was reaching for but couldn't articulate.

The competitor matrix in your own repo already shows it. RuneSignal has feature checkboxes Credo AI, Lakera, and Protect AI don't have. The repackaging + positioning above turns those engineering wins into three distinct revenue lines aimed at three distinct regulated buyers.

5. What To Do This Week
Rename deliverables from "compliance evidence package (S11+S13)" → "RuneSignal Evidence Pack™" across website, API, Stripe.

Ship /evidence dashboard as a filter+export view over existing audit_events + certificate_explanations + control_evidence tables (migrations 036, 038). Zero new tables.

Split Stripe products into Core + Evidence Pack Add-On + Ledger Replay pack. Keep existing PLAN_LIMITS gate for Core.

Draft 2 regulator templates (EU AI Act Annex IV, US NIST AI RMF) and 1 insurance-carrier template (Munich Re-style loss-event sampling).

Send 5 outreach emails to reinsurers (Munich Re, Swiss Re, Hannover Re, SCOR, Lloyd's syndicate Talbot) framing RuneSignal as the independent evidence plane for their AI-liability book.

Continue Phase 9 hardening (Pen Test, SOC 2, DPA, SLA) — without these, none of the above closes in regulated accounts.

Apply to IETF WIMSE + OpenID AgentID working groups — Passport Registry moat starts with standards presence (Phase 8 flagged this).

Bottom line
You are not three years from the unicorn idea — you are one rebrand, one dashboard screen, one Stripe product split, and two pre-signed regulator templates away from shipping the first of the three unicorn products. The engineering is largely done; the packaging is what's missing. Keep the runtime as one product (it must be cryptographically unified), sell Evidence Packs as a metered add-on, build the Registry as the network-effect moat, and layer Decision Ledger + Reversibility as the forensic / insurance expansion.

That is the difference between "RuneSignal, governance platform" and "RuneSignal, the independent Agent Evidence Plane that insurers mandate and EU notified bodies accept." 
```
