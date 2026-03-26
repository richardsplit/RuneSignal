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

## Phase 7: Deep Functional Build
- [ ] Implement Global Modal/Popup System
- [ ] Build S6 Agent Registration Wizard (Form + DB Insert)
- [ ] Build S3 Certificate Generator (Mock trace + Hash + Sign)
- [ ] Build S1 Semantic Policy Builder (Intent definition)
- [ ] Build S7 Integrations Config (Webhook setting)
- [ ] Wire S7 Approve/Reject to trigger DB updates

## Phase 8: Code Refactoring & Optimization
- [ ] Split large page files into smaller components
- [ ] Refactor shared UI elements into `components` dir
- [ ] Optimize API routes and database queries
- [ ] Extract repeating UI logic into custom hooks

## Phase 9: Advanced UI/UX Polish
- [ ] Research contemporary SaaS Figma templates for inspiration
- [ ] Refine UX for a more contemporary, professional look (Figma-level design)
- [ ] Add smooth transitions and micro-animations
- [ ] Enhance data visualizations (charts/graphs)
- [ ] Polish responsive design breakpoints
