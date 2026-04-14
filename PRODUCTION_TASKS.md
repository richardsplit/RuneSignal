# RuneSignal — Production Readiness Execution Tasks

> **Status as of April 2026:** All phases 1–3 are complete. Phase 4 operational hardening is partially complete.

---

## Phase 1: Core Authentication & Multi-Tenancy ✅ COMPLETE

**Goal:** Remove hardcoded tenant IDs and establish real login/signup flows using Supabase Auth.

- [x] **1.1 Setup Supabase Auth UI**
  - `src/app/login/page.tsx` — email/password + GitHub/Google OAuth via `@supabase/ssr` v0.9.0
  - `signInWithPassword()`, `signUp()`, `signInWithOAuth()` implemented
  - Glassmorphism form with RuneSignal branding

- [x] **1.2 Protect Routes & Middleware**
  - `middleware.ts` — Supabase SSR session required for all routes except `/login`, `/landing`, `/legal`, `/security`, `/mfa-verify`, `/onboarding`, `/_next`, public API routes
  - Unauthenticated users redirected to `/`

- [x] **1.3 Tenant Onboarding Wizard**
  - `src/app/onboarding/page.tsx` — collects Company Name, inserts into `tenants` table, links user via `tenant_members` with `role: 'owner'`, calls `/api/v1/onboarding/set-admin-role` for JWT claims, redirects to `/dashboard`

- [x] **1.4 Purge Hardcoded Tenant IDs**
  - Zero occurrences of `7da27c93-6889-4fda-8b22-df4689fbbcd6` in any `.ts`/`.tsx`/`.js`/`.sql` file
  - Server components derive `tenant_id` from `X-Tenant-Id` header set by middleware
  - Client components use `useTenant()` context backed by `tenant_members` DB lookup
  - No `localStorage.getItem('tl_tenant_id')` calls anywhere

- [x] **1.5 Real MFA Implementation**
  - `src/app/account-settings/mfa/page.tsx` — TOTP enrollment with QR code (`supabase.auth.mfa.enroll()`), verification (`supabase.auth.mfa.challenge()` + `verify()`), factor management
  - `middleware.ts` — AAL2 enforcement via `getAuthenticatorAssuranceLevel()` checking `nextLevel === 'aal2' && currentLevel !== 'aal2'`, redirects to `/mfa-verify`
  - `src/app/mfa-verify/page.tsx` — challenge/verify flow for already-enrolled users

---

## Phase 2: Commercial Infrastructure & API Provisioning ✅ COMPLETE

**Goal:** Allow users to pay via Stripe and issue actionable API keys.

- [x] **2.1 Stripe Setup & Config**
  - `stripe` v21.0.1 installed
  - `lib/stripe.ts` — initialised with API version and app info
  - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local.example`

- [x] **2.2 Subscription Billing Portal**
  - `src/app/billing/page.tsx` — Starter / Pro / Enterprise tiers with pricing, monthly consumption bar, utilisation percentage
  - `src/app/api/v1/billing/checkout/route.ts` — `stripe.checkout.sessions.create()` with `mode: 'subscription'` and tenant metadata

- [x] **2.3 Stripe Webhook Handler**
  - `src/app/api/v1/billing/webhook/route.ts` — `stripe.webhooks.constructEvent()` signature verification
  - Handles: `checkout.session.completed` (sets `plan_tier` + `stripe_customer_id`), `customer.subscription.deleted` (downgrades to free), `invoice.payment_failed` (sets `past_due`)
  - `e2e/billing.spec.ts` — E2E tests for billing flow

- [x] **2.4 Developer API Key Management**
  - UI: `ApiKeysTab` embedded in `src/app/account-settings/page.tsx` — generate key (shown raw once), list, revoke
  - API: `src/app/api/v1/keys/route.ts` — POST (create + SHA-256 hash), GET (list metadata), DELETE (tenant-scoped revoke)
  - Middleware validates `Bearer tl_*` keys by hashing and looking up `api_keys` table

- [x] **2.5 Tenant-Configurable Webhooks**
  - UI: `WebhooksTab` embedded in `src/app/account-settings/page.tsx` — per-tenant Slack URL + custom webhook URL
  - `lib/webhooks/emitter.ts` — queries `webhook_settings` table per `tenant_id` via `createAdminClient()`, exponential backoff delivery, HMAC-SHA256 signing

---

## Phase 3: Developer Experience & Docs ✅ COMPLETE

**Goal:** Enterprise adoption requires pristine documentation and easy integration.

- [x] **3.1 OpenAPI Specification**
  - `public/openapi.yaml` — 4,461 lines, 99 paths (S5 Insurance paths removed April 2026)
  - Covers: `/api/v1/provenance`, `/api/v1/firewall/evaluate`, `/api/v1/exceptions`, `/api/v1/agents`, `/api/v1/compliance/evidence-export`, `/api/v1/keys`, `/api/v1/billing`, `/api/v1/integrations`, and all other public routes
  - Auth schemes: `ApiKeyAuth` (Bearer `tl_*`), `SessionAuth`
  - Full request/response schemas with examples

- [x] **3.2 API Documentation UI**
  - `src/app/documentation/page.tsx` — dynamic import of `swagger-ui-react` v5.32.1 with SSR disabled
  - Renders `openapi.yaml` with custom RuneSignal dark theme styling
  - `src/app/documentation/quickstart/page.tsx` — step-by-step guide with Node/Python/cURL code samples

- [x] **3.3 Request Logging / Usage Tracking**
  - `middleware.ts` — billable routes (`/api/v1/provenance`, `/intent`, `/moral`, `/verify`, `/enforce`, `/firewall`) call `supabase.rpc('increment_api_usage', { t_id: tenantId })` fire-and-forget
  - Plan limit enforcement: reads `tenants.api_requests_monthly` vs `PLAN_LIMITS` map, returns 429 when exceeded
  - `src/app/billing/page.tsx` — "Monthly Consumption" section with usage bar and utilisation percentage

---

## Phase 4: Operational Readiness 🔄 PARTIALLY COMPLETE

**Goal:** Hardening, monitoring, and testing to ensure 99.9% uptime.

- [ ] **4.1 Sentry Integration (Error Monitoring)**
  - Install `@sentry/nextjs`
  - Configure `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

- [x] **4.2 GitHub Actions CI/CD Pipeline**
  - `.github/workflows/main.yml` — checkout → setup Node → `npm ci` → `npm run build` → `npm run test`
  - `.github/workflows/zap-scan.yml` — OWASP ZAP baseline scan weekly (Mon 03:00 UTC) + manual dispatch, 90-day artifact retention

- [x] **4.3 E2E Testing with Playwright**
  - `e2e/billing.spec.ts` — billing flow tests
  - Additional E2E coverage exists for auth and API routes

- [ ] **4.4 Environment Security Sweep**
  - Verify `.gitignore` covers all `.env*` variants
  - Document key rotation process for Supabase `SERVICE_ROLE_KEY` and Ed25519 signing keys

---

## Additional Items Completed (Beyond Original Scope)

- [x] **Firewall unified evaluation endpoint** — `POST /api/v1/firewall/evaluate` chains S6→S1+S8→S5→S7→S3, `supabase/migrations/029_firewall_evaluations.sql`
- [x] **Slack interactive approve/reject** — Block Kit buttons with `hitl_approve_<id>` / `hitl_reject_<id>` action IDs, full HMAC-verified callback handler
- [x] **Teams, Jira, ServiceNow integrations** — `lib/integrations/dispatcher.ts` + install/webhook routes for all three
- [x] **Node SDK** — `packages/sdk-node/` — `TrustLayerClient` with `FirewallResource`, `AgentsResource`, `ExceptionsResource`, `ProvenanceResource`
- [x] **Python SDK** — `packages/sdk-python/` — async `httpx` client with Pydantic models
- [x] **SSO (Okta / Entra / Auth0)** — `lib/auth/sso/` + `/api/v1/auth/sso/[provider]` OAuth routes, `sso_configurations` table
- [x] **SIEM export** — `lib/integrations/siem/` CEF + JSON formatters, push/pull endpoints
- [x] **HIPAA / SOX / GDPR / PCI-DSS policy packs** — `lib/modules/s1-conflict/policy-packs/` with `evaluatePacks()` function
- [x] **EU AI Act evidence export** — `lib/modules/compliance/eu-ai-act-report.ts` maps S3+S7+S11 to Articles 13, 14, 17, 26
- [x] **ISO 42001 evidence export** — `lib/modules/compliance/iso-42001-report.ts` maps to 5 mandatory artifact categories (Clauses 6.1, 8.2, 8.5, 9.1, 10.2)
- [x] **DPA + SLA** — `/legal/dpa` and `/legal/sla` publicly accessible
- [x] **Architecture trust document** — `/security` publicly accessible, print-optimised for PDF export
- [x] **S5 Insurance fully gated** — removed from sidebar, removed from OpenAPI spec, `/api/v1/insurance/*` returns 404 in middleware
- [x] **S8 MoralOS / S15 Physical AI / S17 Red Teaming** — removed from sidebar, middleware redirects direct URL access
