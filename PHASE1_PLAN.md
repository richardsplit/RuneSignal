# Phase 1 Implementation Plan

## Repo Inspection Findings

### Hardcoded Tenant IDs Found

| File | Line(s) | ID | Context |
|------|---------|---|---------|
| `src/app/exceptions/page.tsx` | 116, 138 | `32c2de2e-e89d-44a6-98e7-27ee88e06bc7` | `localStorage.getItem('tl_tenant_id') \|\| '32c2de...'` — used in `fetchTickets()` and `handleAction()` functions (dead code — the page also has a working `useCallback`-based `load()` that uses the api client). |
| `src/lib/api.ts` | 10-11 | `demo-tenant` (string fallback, not a UUID) | `NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant'` — used by every `apiFetch()` call as the `X-Tenant-Id` header. |
| `tests/s5-insurance-verify.ts` | 8 | `7da27c93-6889-4fda-8b22-df4689fbbcd6` | Test-only. |
| `tests/s6-identity-verify.ts` | 5 | `7da27c93-6889-4fda-8b22-df4689fbbcd6` | Test-only. |
| `tests/s7-hitl-verify.ts` | 7 | `7da27c93-6889-4fda-8b22-df4689fbbcd6` | Test-only. |

**Note:** The primary hardcoded UUID `7da27c93-...` does NOT appear in any runtime `.ts`/`.tsx` source code — only in test files and documentation (`.md` files). The runtime problem is the `demo-tenant` fallback in `src/lib/api.ts` and the `32c2de2e-...` UUID in `exceptions/page.tsx`.

### S5 Insurance Public-Facing References

| Location | Type | Detail |
|----------|------|--------|
| **Sidebar** (`src/components/Sidebar.tsx`) | Navigation | Insurance is NOT in the sidebar (already removed from nav sections). |
| **Command Palette** (`src/components/CommandPalette.tsx`) | Navigation | Line 81: `{ id: 'nav-insurance', label: 'Risk & Insurance', href: '/insurance' }` and Line 105-110: "File Insurance Claim" action. |
| **Header** (`src/components/Header.tsx`) | Route title | Line 15: `'/insurance': { section: 'Risk & Identity', title: 'Risk & Insurance'}` |
| **Landing/Dashboard page** (`src/app/page.tsx`) | Module card | Lines 68-76: "Risk & Insurance" card with `/insurance` link and "Actuarial modeling, premiums and active claim tracking" description. |
| **Audit page** (`src/app/audit/page.tsx`) | Category | Lines 82, 110: `'insurance'` as event category in demo data and category labels. |
| **Insurance page** (`src/app/insurance/page.tsx`) | Full page | Entire customer-facing insurance dashboard. |
| **Insurance analytics** (`src/app/insurance/analytics/page.tsx`) | Full page | Insurance analytics page. |
| **API routes** (`src/app/api/v1/insurance/*`) | API endpoints | 4 route files: `/insurance`, `/insurance/risk`, `/insurance/claims`, `/insurance/analytics`. |
| **API boundary** (`lib/api/boundary.ts`) | Public API | Line 38: `/api/v1/insurance/risk` is listed as PUBLIC API route. |
| **OpenAPI spec** (`public/openapi.yaml`) | Documentation | Line 989+: `/insurance/analytics` endpoint documented. |
| **API client** (`src/lib/api.ts`) | Client methods | Lines 58-68, 166-190: `InsuranceClaim` interface and `insurance` client methods. |
| **Metrics route** (`src/app/api/v1/metrics/route.ts`) | Dashboard metric | Line 28: counts `insurance_claims` table. |
| **Salesforce plugin** (`lib/plugins/prebuilt/salesforce.ts`) | Integration | Entire file maps insurance claim events to Salesforce cases. |
| **Firewall** (`lib/modules/firewall/service.ts`) | Internal use | Line 13: imports `RiskEngine` — **this stays** (internal risk scoring). |

---

## Impacted Files

### Task A: Purge Hardcoded Tenant IDs (Runtime Code)

1. **`src/lib/api.ts`** — Replace `NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant'` fallback with real tenant resolution via TenantContext.
2. **`src/app/exceptions/page.tsx`** — Remove dead code with hardcoded `32c2de2e-...` UUID (lines 116-160+).

### Task A2: Update Test Hardcoded Tenant IDs

3. **`tests/s5-insurance-verify.ts`** — Replace hardcoded UUID with env-based `TEST_TENANT_ID`.
4. **`tests/s6-identity-verify.ts`** — Replace hardcoded UUID with env-based `TEST_TENANT_ID`.
5. **`tests/s7-hitl-verify.ts`** — Replace hardcoded UUID with env-based `TEST_TENANT_ID`.

### Task B: Remove/Admin-Gate S5 Insurance from Public Surfaces

6. **`src/components/CommandPalette.tsx`** — Remove insurance navigation and "File Insurance Claim" action.
7. **`src/components/Header.tsx`** — Remove `/insurance` from route title map.
8. **`src/app/page.tsx`** — Remove "Risk & Insurance" module card.
9. **`src/app/audit/page.tsx`** — Remove `'insurance'` category from demo events and category labels.
10. **`lib/api/boundary.ts`** — Remove `/api/v1/insurance/risk` from `PUBLIC_API_ROUTES`.
11. **`public/openapi.yaml`** — Remove `/insurance/analytics` endpoint.
12. **`src/lib/api.ts`** — Remove `InsuranceClaim` interface and `insurance` client methods.
13. **`src/app/api/v1/metrics/route.ts`** — Remove `insurance_claims` count from metrics aggregation.

### Files NOT touched (rationale):

- **`lib/modules/s5-insurance/*`** — Internal code stays (per master doc: "The code stays; the positioning does not").
- **`lib/modules/firewall/service.ts`** — Uses RiskEngine internally (per master doc: "risk score data can live as internal telemetry powering S7 escalation thresholds").
- **`lib/plugins/prebuilt/salesforce.ts`** — Internal plugin, not customer-facing navigation or route.
- **`src/app/insurance/page.tsx`**, **`src/app/insurance/analytics/page.tsx`** — Pages stay in codebase but are unreachable since all navigation links are removed. Removing the pages entirely would be a broader cleanup and risks touching route compilation.
- **`src/app/api/v1/insurance/*` routes** — Routes stay in codebase but are de-listed from public API boundary and removed from all navigation. API keys cannot reach them since they're not in `PUBLIC_API_ROUTES`, and dashboard session is required. Admin users who know the URL can still access (this is the admin-gate behavior).
- **`lib/modules/s13-intel/service.ts`** — Contains `'insurance.claim.pending_hitl'` in internal intel mapping; internal telemetry, not customer-facing.
- **`src/modules/deferred/s5-insurance/DEFERRED.md`** — Already has deferred notice, no change needed.

---

## Implementation Plan

### Smallest Safe Implementation Path

**Task A — Hardcoded Tenant ID Purge:**

1. **`src/lib/api.ts`**: The `TENANT_ID` export is used by `apiFetch()` as a default header. The correct fix is:
   - The middleware already sets `X-Tenant-Id` header on server-side requests.
   - For client-side `apiFetch()`: We cannot use React context inside a plain TS module. Instead, we should modify `apiFetch()` to NOT set a hardcoded `X-Tenant-Id` header. The middleware already resolves tenant from session and sets it — so API route handlers already get `X-Tenant-Id` from middleware when the user has a session.
   - However, some API routes read `X-Tenant-Id` from `request.headers`. Since these client-side fetches go through Next.js, the middleware intercepts them and sets the header on the response, not the request. The routes read from the request.
   - **Safest approach**: Make `apiFetch()` accept an optional `tenantId` param, and expose a React hook `useApi()` that reads from `TenantContext` and passes it. For the immediate fix: remove the hardcoded fallback and throw if no tenant is available, allowing pages to fall back to demo data as they already do.

2. **`src/app/exceptions/page.tsx`**: Lines 113-160+ contain dead code (`fetchTickets` and `handleAction` functions) that duplicate the working `load()` and `handleResolve()` callbacks above them. The dead code uses `localStorage.getItem('tl_tenant_id') || '32c2de2e-...'`. Safe fix: delete the dead code entirely.

3. **Test files**: Replace hardcoded UUIDs with `process.env.TEST_TENANT_ID || 'test-tenant-id'`.

**Task B — S5 Insurance De-listing:**

4. Remove insurance navigation entry from CommandPalette.
5. Remove insurance route title from Header.
6. Remove insurance module card from the landing page.
7. Remove insurance category from audit page demo data and labels.
8. Remove `/api/v1/insurance/risk` from public API boundary.
9. Remove `/insurance/analytics` endpoint from OpenAPI spec.
10. Remove insurance client methods from `src/lib/api.ts`.
11. Remove `insurance_claims` count from metrics route.

---

## Assumptions and Risks

### Assumptions

1. **The `TenantContext` is already wired and working** — confirmed by inspecting `lib/contexts/TenantContext.tsx`. It fetches `tenant_id` from `tenant_members` via Supabase auth. The middleware also resolves tenant and sets `X-Tenant-Id`.
2. **API routes read `X-Tenant-Id` from request headers** — confirmed in metrics route and others. This header must come from the client-side fetch for dashboard pages.
3. **The dead code in `exceptions/page.tsx` is truly dead** — confirmed by reading the component: `load()` is called in `useEffect`, and `handleResolve()` handles actions. The duplicate `fetchTickets()` and `handleAction()` are never called (they reference undefined `setExceptions` and `setResolved` state variables).
4. **Insurance API routes should remain accessible to authenticated admin users** — the master doc says "admin-gate" not "delete". Removing from navigation + public API boundary achieves this.
5. **Test files are verification scripts, not CI-blocking tests** — they are standalone files in `/tests/` (not in `__tests__/` or matched by vitest config for auto-run).

### Risks

1. **Risk**: Removing the `TENANT_ID` fallback from `api.ts` could break pages that haven't been migrated to use `TenantContext`. **Mitigation**: Pages already handle fetch errors gracefully (falling back to demo data). We'll make `apiFetch()` throw a clear error when no tenant is available, and add a `tenantId` parameter.
2. **Risk**: Some page components might be importing `InsuranceClaim` or `insurance` from `src/lib/api.ts`. **Mitigation**: The insurance pages (`/insurance`, `/insurance/analytics`) will break their imports, but they are now unreachable via navigation. Any build error here would surface in CI.
3. **Risk**: Removing `insurance_claims` from the metrics route changes the API response shape. **Mitigation**: The dashboard page does not appear to use this metric directly; it's part of the metrics summary object.

---

## Acceptance Criteria

1. **No hardcoded tenant UUID appears in any runtime `.ts`/`.tsx` file.** `grep -rn "7da27c93\|32c2de2e" --include="*.ts" --include="*.tsx" src/ lib/` returns zero matches.
2. **No `tl_tenant_id` localStorage usage** exists in any source file.
3. **`src/lib/api.ts` does not export a hardcoded `TENANT_ID` constant** that bypasses auth.
4. **No navigation link, command palette entry, or landing page card points to `/insurance`.**
5. **`/api/v1/insurance/risk` is NOT in `PUBLIC_API_ROUTES`.**
6. **The insurance endpoint is NOT in the OpenAPI spec.**
7. **The app builds without errors** (excluding the insurance pages which are now unreachable).
8. **The firewall's internal use of `RiskEngine` is preserved.**
9. **Existing test files use environment-based tenant IDs** (`process.env.TEST_TENANT_ID`).

---

## Tests to Add or Update

1. **Update `tests/s5-insurance-verify.ts`** — env-based tenant ID
2. **Update `tests/s6-identity-verify.ts`** — env-based tenant ID
3. **Update `tests/s7-hitl-verify.ts`** — env-based tenant ID
4. **Verify `e2e/api.spec.ts`** — already uses `process.env.TEST_TENANT_ID || 'test-tenant-e2e'` (no change needed, already correct pattern)
