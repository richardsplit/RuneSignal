# TrustLayer — Production Readiness Execution Tasks

> **For: Gemini Flash or other coding models**
> **Goal:** Take TrustLayer from a functional prototype to a true production-ready SaaS.
> **Instructions for the Model:** Work through these phases one by one. Check off `[x]` as you complete them. Maintain existing architectural patterns (Server Components, explicit Supabase Admin vs Anon clients, inline styling with `globals.css` utilities).

---

## Phase 1: Core Authentication & Multi-Tenancy

**Goal:** Remove hardcoded tenant IDs and establish real login/signup flows using Supabase Auth.

- [ ] **1.1 Setup Supabase Auth UI**
  - Install `@supabase/ssr` or `@supabase/auth-ui-react` if not present.
  - Create `src/app/login/page.tsx` with a clean, glassmorphism login/signup form.
  - Configure Supabase OAuth or Email/Password.
- [ ] **1.2 Protect Routes & Middleware**
  - Update `middleware.ts` to require a valid Supabase session for all routes under `/` (except `/login`, `/api/v1/*`).
  - Redirect unauthenticated users to `/login`.
- [ ] **1.3 Tenant Onboarding Wizard**
  - Create `src/app/onboarding/page.tsx` for new users post-signup.
  - Collect: Company Name, Primary Use Case.
  - Action: Insert a new row into the `tenants` table -> link the Supabase User to this `tenant_id` -> redirect to dashboard.
- [ ] **1.4 Purge Hardcoded Tenant IDs**
  - Globally search for `7da27c93-6889-4fda-8b22-df4689fbbcd6`.
  - Replace `localStorage.getItem('tl_tenant_id')` with real server-side session checks (for server components) or Supabase client `getUser()` (for client components).
- [ ] **1.5 Real MFA Implementation**
  - Create `src/app/account-settings/mfa/page.tsx`.
  - Implement Supabase Auth TOTP Enrollment (QR code generation and verification).
  - Enforce MFA at the middleware layer based on `aal2` (Authenticator Assurance Level).

---

## Phase 2: Commercial Infrastructure & API Provisioning

**Goal:** Allow users to pay via Stripe and issue actionable API keys.

- [ ] **2.1 Stripe Setup & Config**
  - Install `stripe` and `@stripe/stripe-js`.
  - Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.local.example`.
- [ ] **2.2 Subscription Billing Portal**
  - Create `src/app/billing/page.tsx` with 3 tiers (Starter, Pro, Enterprise).
  - Implement an API route `/api/v1/billing/checkout` to generate a Stripe Checkout Session using `stripe.checkout.sessions.create()`.
- [ ] **2.3 Stripe Webhook Handler**
  - Create `/api/v1/billing/webhook/route.ts` to listen to Stripe events.
  - Handle `checkout.session.completed` to update the `tenants` table with `stripe_customer_id` and `plan_tier`.
- [ ] **2.4 Developer API Key Management**
  - Create `src/app/settings/api-keys/page.tsx`.
  - Create a new DB table `api_keys` (id, tenant_id, key_hash, created_at, last_used).
  - Build UI to generate read/write keys for external integration, storing the hashed version in the DB and showing the raw key only once.
- [ ] **2.5 Tenant-Configurable Webhooks**
  - Create `src/app/settings/webhooks/page.tsx`.
  - Create a new DB table `tenant_settings` (tenant_id, slack_webhook_url, custom_webhook_url).
  - Update `WebhookEmitter` (`lib/webhooks/emitter.ts`) to query this table instead of using environment placeholders.

---

## Phase 3: Developer Experience & Docs

**Goal:** Enterprise adoption requires pristine documentation and easy integration.

- [ ] **3.1 OpenAPI Specification**
  - Create a file `public/openapi.yaml` documenting all API routes (`/api/v1/provenance`, `/intent`, `/evaluate`, etc.).
  - Include auth schemes (Bearer token), request/response schemas, and example payloads.
- [ ] **3.2 API Documentation UI**
  - Create `src/app/documentation/page.tsx`.
  - Integrate a library like `swagger-ui-react` to render the `openapi.yaml` file natively inside the TrustLayer dashboard shell.
- [ ] **3.3 Request Logging / Usage Tracking**
  - Update `middleware.ts` or individual API routes to log request counts per tenant.
  - Add a "Usage" section to the Billing page showing API calls vs. tier limits.

---

## Phase 4: Operational Readiness 

**Goal:** Hardening, monitoring, and testing to ensure 99.9% uptime.

- [ ] **4.1 Sentry Integration (Error Monitoring)**
  - Install `@sentry/nextjs`.
  - Configure `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` to capture unhandled exceptions in API routes and client-side crashes.
- [ ] **4.2 GitHub Actions CI/CD Pipeline**
  - Create `.github/workflows/main.yml`.
  - Steps: Checkout -> Setup Node -> `npm ci` -> `npm run build` -> `npm run test`.
  - Rule: Main branch requires this workflow to pass before deployment.
- [ ] **4.3 E2E Testing with Playwright**
  - Install `@playwright/test`.
  - Write basic critical-path tests in `e2e/`:
    - `auth.spec.ts` (Login flow)
    - `dashboard.spec.ts` (Navigation load)
    - `api.spec.ts` (Verify S3 provenance API returns 200).
- [ ] **4.4 Environment Security Sweep**
  - Ensure `.gitignore` is strictly covering `.env*`.
  - Create a script `scripts/rotate-keys.js` (or document the manual process) for rotating Supabase `SERVICE_ROLE_KEY` and Application Ed25519 keys securely.
