# TrustLayer — External GTM Actions & Market Entry Requirements

> **Last updated:** 2026-04-09
> These are actions that cannot be done in code. Each requires external vendors, legal counsel, or regulatory engagement. Ordered by revenue impact and urgency.

---

## UNIVERSAL BASELINE (Required for ALL Markets)

Before entering any market below, these two certifications are globally recognised and act as the foundation for every region-specific requirement.

| Action | What It Is | Cost | Timeline | Blocks |
|--------|-----------|------|----------|--------|
| **ISO 27001** | Information Security Management System certification. The global standard for data security controls. Required in every market listed below. | €8–15k | 3–4 months | Every market entry |
| **ISO 42001** | AI Management System certification (Dec 2023). The first international standard specifically for AI governance. Rapidly becoming the cross-border signal for credible AI governance. Recognised in UAE, Singapore, Japan, Korea, Australia, and EU. | €5–12k (typically bundled with 27001) | Concurrent with 27001 | Enterprise sales in every market |
| **Pen Test** | Independent security firm tests the full API surface, RLS policies, auth paths. Report required by every enterprise procurement team globally. | €5–15k | 3–4 weeks | All enterprise contracts |

**Recommended sequence:** Engage ISO 27001/42001 certification together → run pen test before first enterprise demo → pursue market-specific certifications in parallel.

---

## EUROPE (Foundation)

Already documented. Summary:

| Action | Detail | Timeline | Cost |
|--------|--------|----------|------|
| **SOC 2 Type II** | Start observation period now — 6 months before certification eligible. Use Vanta/Drata. | 8 months | €15–40k |
| **DPA (GDPR Art. 28)** | Data Processing Agreement required before any EU customer goes live. Host at trustlayer.io/legal/dpa. Subprocessors: Supabase, Vercel, Upstash, Stripe, Sentry. | 2 weeks | €2–5k |
| **SLA Document** | Public uptime/support commitment. 99.9% monthly. Host at trustlayer.io/legal/sla. | 1 week | ~free |

---

## DUBAI / UAE / MIDDLE EAST

### 1. DIFC (Dubai International Financial Centre) — Very High Priority

**Why first:** DIFC has the most advanced AI-specific regulation in the GCC. Regulation 10 (September 2023) directly governs "autonomous systems" used in commercial contexts — TrustLayer's entire value proposition. The ~5,000 firms registered in DIFC (fintech, asset management, professional services) are exactly TrustLayer's ICP. DIFC also has its own legal system (English common law), making contracts straightforward for a UK/EU company.

**What Regulation 10 requires:**
- AI systems used for "high-risk processing" must be certified by a DIFC-approved body
- Deployer must appoint an **Autonomous Systems Officer (ASO)**
- System must process data only for human-defined purposes
- Full audit trail required for all automated decisions

**TrustLayer's direct relevance:** S7 (HITL), S3 (immutable audit trail), and S1 (conflict prevention) map precisely to Regulation 10 requirements. TrustLayer can be marketed as a Regulation 10 compliance solution.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **DIFC Data Protection Law registration** | Register as a data processor with the DIFC Commissioner of Data Protection | ~$500/yr | 2 weeks |
| **Regulation 10 certification engagement** | Engage a DIFC-approved certification body (list published by DIFC Commissioner) to certify TrustLayer's autonomous systems governance framework | €15–30k | 3–5 months |
| **DPA — DIFC variant** | Must include: automated systems disclosure, ASO contact details, Regulation 10 compliance warranty. GDPR-equivalent DPAs accepted. | Bundle with EU DPA | 1 week |
| **ASO appointment** | Appoint an Autonomous Systems Officer — can be internal or a law firm. DIFC requires this for companies operating automated systems. | Legal fees ~€2k | 2 weeks |

---

### 2. UAE Federal (Mainland) — High Priority

**UAE Federal PDPL** (Decree-Law 45/2021, Implementing Regulations October 2023) covers all UAE companies outside free zones.

**Key requirements for TrustLayer:**
- DPIA mandatory before high-risk automated processing
- Individuals can contest automated decisions with legal/significant effect
- Cross-border data transfers restricted to approved countries or with Standard Contractual Clauses
- DPO appointment required for high-risk processing

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **UAE PDPL DPA** | Data Processing Agreement per UAE Implementing Regulations. Include: purpose, processor obligations, cross-border transfer mechanism (SCCs), automated decision-making disclosure, deletion timelines. | Bundle with EU DPA | 2 weeks |
| **DPO appointment** | Data Protection Officer — can be external (law firm). Required for high-risk AI processing. | €3–8k/yr (external) | 1 month |
| **ISO 27001 + UAE Data Office alignment** | No UAE-native certification yet. ISO 27001 + ISO 42001 are the accepted path until the UAE Data Office publishes its formal scheme (expected 2026-2027). | See Universal Baseline | — |
| **UAE AI Strategy 2031 positioning** | Register as a compliant AI vendor in the UAE AI Council's vendor ecosystem (Smart Dubai portal). Procurement teams in government-linked entities check this. | Free | 1 week |

---

### 3. Saudi Arabia — High Priority (Vision 2030 Window)

**Saudi PDPL** effective September 2023, enforced by SDAIA/NDMO. 48 enforcement actions already issued. Vision 2030 is driving massive fintech, healthtech, NEOM, and smart city procurement — all requiring AI governance.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **SDAIA processor agreement** | SDAIA publishes a prescribed Data Processing Agreement template. TrustLayer must execute this with Saudi customers — cannot use the EU DPA template directly. | Legal review ~€2k | 2 weeks |
| **NDMO 15-domain data governance framework** | Saudi's local standard. Conduct a gap assessment against the 15 domains and produce a compliance declaration. This is required in enterprise procurement RFPs. | Consultant: €5–10k | 6 weeks |
| **SAMA Cybersecurity Framework** (fintech) | If selling to Saudi-licensed financial institutions, SAMA's framework is mandatory. Requires ISO 27001 + specific controls. SAMA may require on-site assessment. | Auditor: €10–20k | 3 months |
| **Data localization review** | Saudi health and financial data may require in-Kingdom storage. Assess whether Supabase offers a Saudi/GCC region. If not, document mitigation strategy in DPA. | Architecture review | 2 weeks |

---

### 4. Qatar — Medium Priority

**Qatar PDPPL** (Law 13/2016) with the Qatar Central Bank AI Guidelines (September 2024) creating hard obligations for financial institutions.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **QCB AI Guidelines compliance** | If selling to Qatar Central Bank-licensed entities: board-approved AI governance, risk assessments, human oversight documentation required. TrustLayer's S7 HITL and S13 Governance Hub map directly to these. | Document mapping | 2 weeks |
| **NCSA vendor assessment** | Qatar's new Cloud Privacy Assessment Tool (April 2026). Submit TrustLayer as assessed SaaS vendor. | Process fee ~€1k | 4 weeks |
| **DPA — Qatar variant** | Based on PDPPL; 72-hour breach notification, penalties up to QAR 5M (~€1.25M). | Bundle with UAE DPA | 1 week |

---

## ASIA

### 5. Singapore — Very High Priority

**Why first in Asia:** Most mature AI governance market in ASEAN. MAS (Monetary Authority of Singapore) has mandatory AI Risk Management Guidelines for financial institutions (November 2025). IMDA's Model AI Governance Framework for Agentic AI (January 2026) directly addresses autonomous AI agent governance — TrustLayer's exact product category.

**Singapore is the regional hub:** A Singapore certification/compliance posture gives access to Southeast Asian enterprise sales from one base.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **MAS TRM Guidelines compliance** | Technology Risk Management guidelines for financial sector. Requires: AI inventory documentation, board oversight trail, third-party AI risk management. Produce a TrustLayer MAS TRM compliance brief. | Internal document | 3 weeks |
| **AI Verify + ISAGO self-assessment** | Singapore government's AI testing toolkit. Running TrustLayer through AI Verify and publishing the ISAGO self-assessment report signals credibility to Singapore enterprise and government buyers. | Free (IMDA-run) | 4 weeks |
| **PDPA Data Processing Agreement** | Required under Singapore PDPA. Include: third-party risk warranty per MAS TRM, AI system audit access rights, purpose limitation. | Bundle with EU DPA | 2 weeks |
| **ISAE 3000 Type II report** | Singapore accepts ISAE 3000 Type II (functional equivalent of SOC 2) instead of SOC 2 itself. If using a Singapore-based auditor, request ISAE 3000 format in addition to SOC 2. | Bundle with SOC 2 engagement | — |
| **Singapore incorporation / local entity** | Not required to sell, but a Singapore entity dramatically accelerates enterprise procurement and MAS engagement. Consider once first 3 enterprise customers are signed. | SGD 300 setup + ~€20k/yr compliance | When ready |

---

### 6. South Korea — High Priority

**AI Basic Act 2024** is the most advanced AI-specific law in Asia after the EU AI Act. High-impact AI systems face mandatory human oversight, transparency, and impact assessment requirements. PIPA (amended 2023) gives individuals the right to demand explanation and contest AI decisions — directly what TrustLayer enables.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **ISMS-P certification** | Korea's Information Security Management System (Personal Information) — the dominant local certification, required for enterprise and regulated sector sales. More demanding than ISO 27001. | KRW 15–30M (~€10–20k) | 4–6 months |
| **PIPA Article 26 DPA** | Mandatory written data processing agreement under PIPA. Must include: automated decision-making disclosure, cross-border transfer notification, breach notification chain. Korean language version required for local customers. | Korean lawyer: €3–5k | 3 weeks |
| **AI Basic Act impact assessment template** | Produce a template showing how TrustLayer customers satisfy the AI Basic Act's impact assessment obligation for high-impact AI systems. TrustLayer's S13 Governance Intel Hub is the direct compliance mechanism — document this mapping. | Internal | 2 weeks |

---

### 7. India — High Priority (2025–2027 Window)

**DPDPA 2023** rules finalized May 2025, compliance deadline ~May 2027. A **Significant Data Fiduciary (SDF)** designation will trigger DPIA, audit, and data localization requirements. This creates urgent demand for governance tooling from India's largest tech, BFSI, and healthtech companies — exactly when TrustLayer should be established.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **DPDPA Section 8 processor agreement** | Written data processing agreement required under DPDPA. Must include: purpose, retention limits, breach reporting chain (CERT-In 6-hour notification still applies now), consent linkage documentation. | Bundle with EU DPA | 2 weeks |
| **CERT-In compliance** | Mandatory 6-hour breach reporting to India's Computer Emergency Response Team. Ensure incident response playbook covers CERT-In notification path. | Internal process | 1 week |
| **ISO 27001 + ISO 42001** | Currently the only meaningful certification India enterprise procurement accepts. DPDPA Audit framework expected from Data Protection Board (not yet constituted). | See Universal Baseline | — |
| **India entity / GST registration** | Required for government procurement; strongly recommended for enterprise BFSI. Consider once first 3 Indian customers signed. | ~€5k setup + compliance | When ready |

---

### 8. Japan — Medium Priority

Conservative but large enterprise market. ISO 27001 (local ISMS variant) required. METI AI governance guidelines widely adopted in procurement.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **ISMS (ISO 27001 — JASA variant)** | Japan's local administration of ISO 27001, managed by JASA. Required for enterprise sales — especially financial and manufacturing sectors. | JPY 2–5M (~€12–30k) | 4–6 months |
| **APPI DPA** | Third-party provision records required under APPI 2022 amendment; cross-border transfer records. Japanese-language DPA version required for Japanese-incorporated customers. | Japanese lawyer: €3–5k | 3 weeks |
| **METI AI governance mapping** | Produce a document showing how TrustLayer maps to the METI AI Governance Guidelines' 11 principles. Widely referenced in enterprise RFPs. | Internal | 2 weeks |

---

### 9. Hong Kong — Medium Priority

PCPD's AI Model Framework (June 2024) explicitly states organisations procuring third-party AI must include governance and privacy requirements in supplier management — creating a direct hook for TrustLayer in vendor selection processes.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **PCPD Model Framework self-assessment** | Complete the PCPD AI Model Framework self-assessment checklist and publish as a trust document. Referenced in HK enterprise procurement. | Internal | 2 weeks |
| **PDPO DPA** | PDPO-aligned data processing clauses; include AI-specific governance warranty per PCPD Model Framework. | Bundle with EU DPA | 1 week |

---

### 10. Australia — High Priority (Government Vertical)

IRAP certification is a hard gate for any Australian government-adjacent sales. Privacy Act reform (ongoing, 2025) will introduce right-to-explanation for high-impact automated decisions — TrustLayer's S11 Explainability is a direct solution.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **IRAP assessment** | Information Security Registered Assessors Program — mandatory for Australian government and government-adjacent work. An IRAP assessor evaluates TrustLayer against the Australian Government ISM (Information Security Manual). | AUD 40–80k (~€25–50k) | 3–4 months |
| **Privacy Act APP processing agreement** | Australian Privacy Principles-aligned processing agreement; automated decision explanation mechanism; cross-border transfer disclosure under APP 8. | Bundle with EU DPA | 2 weeks |
| **Voluntary AI Safety Standard (VAISS)** | Government-endorsed voluntary standard (December 2025). Publishing a VAISS self-assessment signals credibility in Australian government and regulated enterprise procurement. | Internal | 2 weeks |

---

### 11. China — Complex / Partner Model

Entry requires local entity or a certified local partner. MLPS 2.0 is mandatory and requires in-country infrastructure. CAC AI filing is a regulatory prerequisite before deployment.

**Recommendation:** Do not enter China directly. Partner with a Chinese AI governance consultancy that holds MLPS 2.0 certification and can resell TrustLayer's methodology and tooling through a locally-hosted deployment. Revisit after Series A with dedicated China GTM budget.

| Action | Detail | Cost | Timeline |
|--------|--------|------|----------|
| **China partner identification** | Identify 2–3 potential channel partners with MLPS 2.0 certification and AI governance practice | Internal BD | Ongoing |
| **CAC GenAI filing review** | Understand CAC filing requirements for the product category — determine if TrustLayer's hosted model triggers filing obligations | Legal opinion: €3–5k | 4 weeks |

---

## PRIORITY ORDER & INVESTMENT TIMELINE

```
Month 1–2:
  ├── ISO 27001 + ISO 42001 engagement (universal baseline)
  ├── Pen test (Cobalt.io or NCC Group)
  ├── EU DPA finalized + hosted
  ├── SLA document published
  └── Singapore AI Verify self-assessment (free, fast)

Month 2–4:
  ├── SOC 2 Type II observation begins (US/EU enterprise)
  ├── DIFC Data Protection registration
  ├── DIFC Regulation 10 certification engagement
  ├── UAE PDPL DPA + DPO appointment
  ├── MAS TRM compliance brief (Singapore)
  └── PCPD Model Framework self-assessment (Hong Kong, free)

Month 4–8:
  ├── ISMS-P engagement (South Korea)
  ├── ISMS/JASA engagement (Japan)
  ├── NDMO framework gap assessment (Saudi Arabia)
  ├── India DPDPA processor agreement
  └── Australia IRAP engagement (if government vertical targeted)

Month 8–12:
  ├── SOC 2 Type II certification complete
  ├── ISO 27001 + 42001 certification complete
  ├── ISMS-P certification complete (Korea)
  └── First DIFC Regulation 10 certified customer signed
```

---

## BUDGET ESTIMATE (12-MONTH GTM SPEND)

| Category | Low | High |
|----------|-----|------|
| ISO 27001 + ISO 42001 | €13k | €27k |
| SOC 2 Type II (platform + auditor) | €15k | €40k |
| Pen test | €5k | €15k |
| Legal (DPAs × 6 variants, DPO, SLA) | €15k | €35k |
| DIFC Regulation 10 certification | €15k | €30k |
| Singapore AI Verify + ISAE 3000 | €2k | €8k |
| ISMS-P (South Korea) | €10k | €20k |
| NDMO + SAMA (Saudi Arabia) | €15k | €30k |
| IRAP (Australia — optional) | €25k | €50k |
| China legal opinion + partner BD | €5k | €10k |
| **TOTAL** | **€120k** | **€265k** |

At an enterprise ACV of €40–60k, a single EU financial services customer and a single DIFC customer covers the majority of this investment.

---

## REVENUE POTENTIAL BY REGION

| Region | Addressable Segment | Realistic Y1 Customers | ACV | Y1 ARR |
|--------|--------------------|-----------------------|-----|--------|
| EU | FSI, InsurTech, HealthTech | 8–12 | €40k | €400k |
| DIFC / UAE | Fintech, Asset Mgmt | 4–6 | €60k | €300k |
| Saudi Arabia | Vision 2030 tech | 3–5 | €70k | €280k |
| Singapore | MAS-regulated FIs | 5–8 | €50k | €325k |
| South Korea | Enterprise BFSI | 3–5 | €45k | €180k |
| India | SDF-designated entities | 2–4 | €35k | €105k |
| Japan | Financial, manufacturing | 2–3 | €55k | €137k |
| Australia | Govt-adjacent enterprise | 2–4 | €50k | €150k |
| **TOTAL (conservative)** | | **29–47** | | **~€1.9M** |

DIFC is the highest priority outside Europe: fastest procurement cycle (English law, single regulator), highest ACV potential, and Regulation 10 creates a mandatory compliance requirement that TrustLayer directly solves.
