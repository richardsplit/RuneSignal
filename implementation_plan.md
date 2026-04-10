# RuneSignal — Agent Trust Platform Implementation Plan

> Enterprise AI Governance platform branded as **RuneSignal**. 5 modules: Provenance (S3), Identity (S6), Conflict Arbiter (S1), HITL Routing (S7), and Insurance Micro-OS (S5).

This plan covers **Phase 0 (Core Infrastructure)** and **Phase 1 (Module S3 — Provenance Engine)** as the first build increment.

**Infrastructure**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime) + Vercel (Next.js frontend + API routes). No Docker/self-hosted services.

> [!IMPORTANT]
> This is a large platform. We'll build incrementally — Phase 0 + Phase 1 first, verify, then continue with subsequent phases. Each phase adds a module + its dashboard panel.

---

## Proposed Changes

### Core Project Setup (Next.js + Supabase)

#### [NEW] [package.json](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/package.json)
Next.js 14 project with dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `jose`, `crypto` utilities.

#### [NEW] [.env.local.example](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/.env.local.example)
Supabase URL, anon key, service role key, signing key, Stripe keys, etc.

#### [NEW] [next.config.js](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/next.config.js)
Next.js config optimized for Vercel deployment.

#### [NEW] [vercel.json](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/vercel.json)
Vercel deployment config with serverless function settings.

#### [NEW] [.gitignore](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/.gitignore)
Standard Python + Docker + env exclusions.

---

### Core Infrastructure — Supabase Database & Ledger

#### [NEW] [supabase/migrations/001_audit_ledger.sql](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/supabase/migrations/001_audit_ledger.sql)
Creates `tenants` + `audit_events` tables. Enforces immutability with PostgreSQL rules. Indexes for compliance queries. RLS policies for tenant isolation.

#### [NEW] [lib/db/supabase.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/db/supabase.ts)
Supabase client factory — server-side (service role) and client-side (anon key) clients.

#### [NEW] [lib/ledger/signer.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/ledger/signer.ts)
Ed25519 `LedgerSigner` — signs audit events, verifies signatures, exposes public key. Uses Web Crypto API.

#### [NEW] [lib/ledger/service.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/ledger/service.ts)
`AuditLedgerService` — appends events to Supabase audit ledger with signatures. Never updates/deletes.

---

### Core Infrastructure — Auth & API Routes

#### [NEW] [lib/auth/jwt.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/auth/jwt.ts)
JWT token issuance (HS256 for tenants, RS256 for agents), validation. Uses `jose` library.

#### [NEW] [lib/auth/middleware.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/auth/middleware.ts)
Next.js middleware: request ID injection, auth validation, rate limiting.

#### [NEW] [app/api/health/route.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/api/health/route.ts)
Health check endpoint (public).

---

### Core Infrastructure — Webhooks

#### [NEW] [lib/webhooks/emitter.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/webhooks/emitter.ts)
GRC webhook emitter — posts events to Slack, ServiceNow, Jira. Exponential backoff retry.

---

### Module S3 — AI Output Provenance Engine

#### [NEW] [lib/sdk/atp-sdk.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/sdk/atp-sdk.ts)
`ATPClient` — drop-in OpenAI/Anthropic/Azure wrapper. Intercepts LLM calls, hashes I/O, POSTs to certify endpoint.

#### [NEW] [lib/modules/s3-provenance/types.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s3-provenance/types.ts)
TypeScript types: `CertifyRequest`, `CertifyResponse`, `ProvenanceResponse`, `CertificatePayload`.

#### [NEW] [lib/modules/s3-provenance/certificate.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s3-provenance/certificate.ts)
Certificate generation service — hashes inputs/outputs, creates signed audit event, returns certificate.

#### [NEW] [app/api/v1/provenance/route.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/api/v1/provenance/route.ts)
All 6 S3 API routes: `certify`, `get certificate`, `verify`, `audit query`, `pubkey`, `model-versions`.

#### [NEW] [lib/modules/s3-provenance/version-monitor.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s3-provenance/version-monitor.ts)
Model version fingerprinting — detects silent model updates, emits audit events + GRC webhooks.

---

### Module S6 — Agent Identity & Permission Registry

#### [NEW] [lib/modules/s6-identity/types.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s6-identity/types.ts)
TypeScript types: `AgentCredential`, `PermissionScope`, `RegisterAgentRequest`.

#### [NEW] [lib/modules/s6-identity/service.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s6-identity/service.ts)
S6 Identity Service — handles agent registration, JWT issuance (RS256), permission validation, and suspension.

#### [NEW] [lib/modules/s6-identity/mcp-proxy.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s6-identity/mcp-proxy.ts)
MCP server proxy enforcement layer — validates tool calls against permission scopes.

#### [NEW] [app/api/v1/agents/register/route.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/api/v1/agents/register/route.ts)
Agent registration endpoint.

#### [NEW] [app/api/v1/agents/enforce/route.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/app/api/v1/agents/enforce/route.ts)
Tool call enforcement endpoint for MCP proxy.

---

### Module S1 — Agent Conflict Arbiter

#### [NEW] [lib/modules/s1-conflict/types.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/lib/modules/s1-conflict/types.ts)
TypeScript types: `AgentIntent`, `ArbiterResponse`, `ConflictPolicy`.

#### [NEW] [lib/modules/s1-conflict/service.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/lib/modules/s1-conflict/service.ts)
S1 Arbiter Service — handles intent registration, real-time overlap detection (pgvector), and policy enforcement (BLOCK/QUEUE).

#### [NEW] [lib/modules/s1-conflict/policy-engine.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/lib/modules/s1-conflict/policy-engine.ts)
Policy Engine — evaluates semantic similarity between incoming intent and existing policies or active intents.

#### [NEW] [app/api/v1/intent/route.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/api/v1/intent/route.ts)
Arbiter intent registration endpoint.

---

### Module S7 — HITL Ops Routing Platform

#### [NEW] [lib/modules/s7-hitl/types.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/lib/modules/s7-hitl/types.ts)
TypeScript types: `ExceptionTicket`, `SlaTier`.

#### [NEW] [lib/modules/s7-hitl/service.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/lib/modules/s7-hitl/service.ts)
S7 HITL Service — handles ticket creation, Slack routing, and approval state management.

#### [NEW] [app/api/v1/exceptions/route.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/api/v1/exceptions/route.ts)
Exception ticker management APIs.

---

### Module S5 — Insurance Micro-OS

#### [NEW] [lib/modules/s5-insurance/types.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s5-insurance/types.ts)
TypeScript types: `CoveragePolicy`, `RiskProfile`, `AgentTelemetry`.

#### [NEW] [lib/modules/s5-insurance/risk-engine.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/lib/modules/s5-insurance/risk-engine.ts)
Actuarial Risk Engine — aggregates agent stats (violations, SLA breaches, anomaly rates) to compute a dynamic Risk Score (1-100).

#### [NEW] [app/api/v1/insurance/route.ts](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/api/v1/insurance/route.ts)
Insurance API endpoints to view premiums, risk scores, and coverage status.

---

### RuneSignal Dashboard UI (Next.js Pages)

The dashboard is built as Next.js pages with the App Router. **RuneSignal** branding throughout. Uses a rich **emerald green → warm amber** color palette on dark charcoal, glassmorphism, and Inter font.

#### [NEW] [app/layout.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/layout.tsx)
Root layout with Inter font, global styles, RuneSignal branding in sidebar.

#### [NEW] [app/page.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/page.tsx)
Dashboard home — overview cards for all modules, system health, recent audit events.

#### [NEW] [app/globals.css](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/globals.css)
Design system: emerald (#10b981) → amber (#f59e0b) gradients, charcoal (#1a1a2e) background, glassmorphism panels, micro-animations.

#### [NEW] [components/Sidebar.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/components/Sidebar.tsx)
Collapsible sidebar with RuneSignal logo, module navigation, user profile.

#### [NEW] [app/provenance/page.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/provenance/page.tsx)
S3 Provenance panel — certificate table, verification status, model version alerts, animated stat counters.

#### [NEW] [app/identity/page.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/app/identity/page.tsx)
S6 Identity panel — agent fleet dashboard, permission management, status controls.

#### [NEW] [app/conflict/page.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/app/conflict/page.tsx)
S1 Conflict panel — real-time intent analyzer, policy manager, collision history.

#### [NEW] [app/exceptions/page.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/app/exceptions/page.tsx)
S7 Exceptions panel — outstanding HITL requests, SLA metrics, approval workflow.

#### [NEW] [app/insurance/page.tsx](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL%20Nature/Documents/RuneSignal/app/insurance/page.tsx)
S5 Insurance panel — dynamic risk scores, coverage limits, actuarial telemetry dashboard.

#### [NEW] [public/runesignal-logo.svg](file:///c:/Users/Richard.Georgiev/OneDrive%20-%20DIGITALL Nature/Documents/RuneSignal/public/runesignal-logo.svg)
RuneSignal shield logo in SVG format.

---

---

## UI Design Direction

| Aspect | Choice |
|--------|--------|
| **Brand** | **RuneSignal** — shield logo, emerald/amber palette |
| **Theme** | Dark mode — charcoal (#1a1a2e) bg, emerald (#10b981) primary, amber (#f59e0b) accent |
| **Cards** | Glassmorphism — frosted glass panels with `backdrop-filter: blur(12px)` |
| **Typography** | Inter (Google Fonts), clean hierarchy with weight variations |
| **Animations** | Smooth page transitions, card hover lifts, animated stat counters, pulse effects on live data |
| **Layout** | Collapsible sidebar + main content area, responsive CSS Grid |
| **Data Viz** | Animated SVG charts for certificate throughput, conflict rates, SLA health |
| **Colors** | Emerald → Amber gradient palette with teal/rose/slate status indicators |

---

## Phase 7: Deep Functional Build (UI Interactivity + Backend) [COMPLETED]
Connecting the front-end dashboard interactions to the backend database.
- Building Global Modal/Popup components for forms.
- Implementing S6 Agent Registration Wizard with Supabase inserts.
- Creating the S3 Provenance Certificate generator popup to mock and hash inputs.
- Building the S1 Semantic Policy definition UI.
- Wiring up the S7 Exceptions approval/rejection workflows to update ticket states.

## Phase 7.8: MFA Configuration Sub-flow [COMPLETED]
Making security configuration realistic and interactive.
- **MFASetupModal**: A multi-step setup wizard (QR Code -> Verification -> Recovery Keys).
- **QR Simulation**: Using a generated QR code (placeholder) and requiring a 6-digit numeric input.
- **State Persistence**: Storing MFA status and last-configured timestamp in `localStorage`.

## Phase 8: Code Refactoring & Optimization [COMPLETED]
Ensuring the codebase is scalable, performant, and maintainable.
- **Modularization**: Splitted massive dashboard files (Identity, Provenance, Conflict, Exceptions, Insurance) and the Account Settings page into dedicated feature components.
- **Custom Hooks**: Extracted logic for `localStorage` synchronization into a reusable `useLocalStorage` hook, simplifying state management across all platform modules.
- **Improved Maintainability**: Isolated feature-specific UI logic from page layouts, reducing file complexity and improving core readability.

## Phase 8.1: Platform Refinement & Fixes [NEW]
Transitioning from simulated logic to real-world infrastructure and API integrations.

### Part 1: Security & Identity Sync
- **Header Enforcement**: Update `middleware.ts` to validate `X-Agent-Id` for all authenticated v1 API routes.
- **Database Validation**: Connect `S6IdentityService` to the Supabase `agent_credentials` table to verify agent status (`active`/`suspended`) in real-time.
- **Upstash Redis Rate Limiting**: Implement per-tenant rate limiting using `@upstash/redis` in the edge-compatible middleware.

### Part 2: S3 Provenance - Real LLM Certification
- **Real SDK Integration**: Install and configure `openai` and `@anthropic-ai/sdk`.
- **ATPClient Logic**: update `atp-sdk.ts` to perform real upstream calls to LLM providers using environment-secured API keys.
- **SHA-256 Hashing**: Ensure the certification pipeline in `S3ProvenanceService` performs cryptographic hashing of both inputs and outputs before signing.
- **Audit Ledger Persistence**: Save verified certificates directly to the Supabase `audit_events` table.

### Part 3: S1 Conflict - Real-time Arbiter
- **pgvector Search**: Implement real vector distance calculation in `S1ArbiterService` using PostgreSQL `pgvector` operators to detect semantic conflicts.
- **Intent Queueing**: Build a real queueing mechanism stored in Supabase to handle `QUEUE` policy outcomes.

### Part 4: S7 Exceptions - Workflow Automation
- **Real Webhooks**: Move from mock logs to real POST requests to Slack/Teams endpoints defined in tenant configuration.
- **State Management**: implement a real state machine for tickets (Open -> In Review -> Resolved) backed by Supabase.

### Part 5: S5 Insurance - Actuarial Logic
- **Dynamic Scoring**: build an aggregator that computes Risk Scores by querying the frequency and severity of agent violations in `audit_events`.
- **Claims API**: Implement real endpoints for submitting and processing insurance claims.

## Phase 9: Advanced UI/UX Polish
Elevating the visual design to a highly contemporary, professional standard without breaking existing functionality.
- Researching contemporary SaaS Figma templates and existing modern designs for inspiration and overlaying existing layout.
- Upgrading styling to ensure a premium Enterprise SaaS feel (Figma-level design system).
- Integrating subtle micro-animations and smooth transitions.
- Polishing responsive layout breakpoints for different screen sizes.
- Enhancing data visualization with interactive charts elements.

---

## Verification Plan

### Dev Server
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### API Endpoint Test
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/v1/verify/pubkey
```

### Dashboard UI Test (Browser)
- Open `http://localhost:3000` in browser
- Verify: RuneSignal branding, dark charcoal theme, emerald/amber accents
- Verify: glassmorphism sidebar, module navigation, animated stat cards
- Verify: S3 Provenance panel shows certificate table, model version alerts
- Verify: responsive layout at different viewport sizes
