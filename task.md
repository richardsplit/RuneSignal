# Agent Trust Platform — Build Tasks

## Phase 0: Project Scaffolding & Core Infrastructure
- [x] Initialize Next.js App Router monorepo
- [x] Connect to GitHub repository and push initial scaffold
- [x] Install Supabase & Vercel dependencies
- [x] Create `.env.local`
- [x] Configure `next.config.js` and `vercel.json`
- [x] Build Supabase database schema (`audit_events` with immutability)
- [x] Create Supabase client (`lib/db/supabase.ts`)
- [x] Implement Ed25519 LedgerSigner (`lib/ledger/signer.ts`)
- [x] Build `AuditLedgerService` (`lib/ledger/service.ts`)
- [x] Build shared auth layer (JWT functions & middleware)
- [x] Create API health route
- [x] Build webhook emitter (`lib/webhooks/emitter.ts`)
- [x] Create TrustLayer dashboard UI shell (layout, Sidebar, Home page)
- [x] Generate modern emerald/amber styles (`globals.css`)

## Phase 1: Module S3 — AI Output Provenance Engine
- [x] Build SDK wrapper (`lib/sdk/atp-sdk.ts`)
- [x] Build certificate generation service
- [x] Build S3 API router (all 6 routes)
- [x] Build model version fingerprinting
- [x] Build GRC webhook emitter
- [ ] S3 unit tests
- [x] S3 dashboard UI panel

## Phase 2: Module S6 — Agent Identity & Permission Registry
- [x] Agent credential models & DB migration
- [x] Agent registration & JWT credential issuance
- [x] Permission scope enforcement middleware
- [x] MCP server proxy enforcement layer
- [x] S6 API routes
- [ ] S6 unit tests
- [x] S6 dashboard UI panel

## Phase 3: Module S1 — Agent Conflict Arbiter
- [x] Redis intent registry + pgvector setup
- [x] Policy engine with vector embeddings (Semantic Match)
- [x] Conflict detection logic (Real-time intent overlap check)
- [x] S1 API routes
- [ ] S1 unit tests
- [x] S1 dashboard UI panel

## Phase 4: Module S7 — HITL Ops Routing Platform
- [x] Exception models & SLA tiers
- [x] Notification routing (Slack webhook integration)
- [x] Approval/Rejection proxy endpoints
- [x] S7 API routes
- [x] S7 dashboard UI panel
- [ ] Training pipeline feedback loop
- [ ] S7 API routes
- [ ] S7 unit tests
- [ ] S7 dashboard UI panel

## Phase 5: Module S5 — Insurance Micro-OS
- [x] Actuarial models & telemetry DB
- [x] Risk scoring algorithm
- [x] Coverage policy framework
- [x] Claim generation logic
- [x] S5 API routes
- [ ] S5 unit tests
- [x] S5 dashboard UI panel

## Phase 6: Integration & Polish
- [x] Full audit chain integration test
- [x] End-to-end Dashboard linking (Sidebar)
- [x] Finalize README setup instructions
- [x] TrustLayer logo design finalization
- [x] Vercel deploy validation
- [x] Connect all UI buttons (interactivity)
- [x] Final UI/UX review & polish
- [x] Final verification and push to dev branch

## Phase 7: Deep Functional Build
- [x] Implement Global Modal/Popup System
- [x] Build S6 Agent Registration Wizard (Form + DB Insert)
- [x] Build S3 Certificate Generator (Mock trace + Hash + Sign)
- [x] Build S1 Semantic Policy Builder (Intent definition)
- [x] Build S7 Integrations Config (Webhook setting)
- [x] Wire S7 Approve/Reject to trigger DB updates

## Phase 7.8: MFA Configuration Sub-flow [COMPLETED]
- [x] Create `MFASetupModal` with QR code simulation
- [x] Implement multi-step setup (Scan -> Verify -> Recovery)
- [x] Persist MFA configuration status in `localStorage`

## Phase 8: Code Refactoring & Optimization [COMPLETED]
- [x] Split large page files into smaller components
- [x] Refactor shared UI elements into `components` dir
- [x] Optimize API routes and database queries
- [x] Extract repeating UI logic into custom hooks
- [x] Split `IdentityDashboard` into modular components
- [x] Split `ProvenanceDashboard` into modular components
- [x] Split `ConflictDashboard` into modular components
- [x] Split `ExceptionsDashboard` into modular components
- [x] Split `InsuranceDashboard` into modular components
- [x] Split `AccountSettingsPage` into modular tab components
- [x] Extract `useLocalStorage` custom hook for unified state management
- [x] Standardize all dashboards to use modular patterns and shared hooks

## Phase 8.1: Platform Refinement & Fixes [NEW]
### Part 1: Security & Identity Sync
- [x] Enforce `X-Agent-Id` header validation in middleware
- [x] Connect real Supabase `agent_credentials` table for status checks
- [x] Implement rate limiting using Upstash Redis per tenant
- [x] Fix Agent Registration payload handling (scopes/metadata)
- [x] Switch Identity dashboard to real DB data
- [ ] Build S6 unit tests for registration & enforcement

### Part 2: S3 Provenance - Real LLM Certification
- [x] Install `openai` and `@anthropic-ai/sdk`
- [x] Update `ATPClient` for real upstream LLM calls
- [x] Implement SHA-256 hashing pipeline for I/O
- [x] Persist certified outputs to `audit_events` ledger
- [x] Switch Provenance dashboard to real DB data
- [x] Build S3 unit tests for signature integrity
- [x] Fix Next.js 15+ dynamic route params (Vercel Build Fix)

### Part 3: S1 Conflict - Real-time Arbiter
- [ ] Implement `pgvector` distance calculation for intents
- [ ] Connect semantic policies to enforcement engine
- [ ] Implement Intent Queueing logic using DB
- [ ] Switch S1 dashboard to real collision logs
- [ ] Build S1 unit tests for semantic detection

### Part 4: S7 Exceptions - Workflow Automation
- [ ] Implement real Slack/Teams webhook routing
- [ ] Build ticket life cycle management (Open -> Resolved)
- [ ] Switch HITL dashboard to real ticket data
- [ ] Build S7 unit tests for SLA timers

### Part 5: S5 Insurance - Actuarial Logic
- [ ] Implement real Risk Score aggregation from violations
- [ ] Build claims processing & coverage update logic

## Phase 9: Advanced UI/UX Polish
- [ ] Research contemporary SaaS Figma templates for inspiration
- [ ] Refine UX for a more contemporary, professional look (Figma-level design)
- [ ] Add smooth transitions and micro-animations
- [ ] Enhance data visualizations (charts/graphs)
- [ ] Polish responsive design breakpoints
