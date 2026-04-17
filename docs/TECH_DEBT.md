# Tech Debt & Deferred Items

Tracked items from completed phases that should be addressed in future work.

## From Phase 2 — Approval Gateway (commit c5d42ec)

- [ ] **Dedicated unit tests**: The 3 new approval-request route handlers and SLA auto-action logic in `checkSlas()` lack dedicated test files. Suggested: `tests/approval-requests.test.ts`, `tests/sla-auto-action.test.ts`
- [ ] **`resolveTenantId` duplication**: Tenant resolution function is copy-pasted across `approval-requests/route.ts`, `[id]/route.ts`, `[id]/resolve/route.ts`, and `evidence-export/route.ts`. Extract to a shared utility (e.g. `lib/api/tenant.ts`)
- [ ] **Dual dispatch on POST**: The POST `/approval-requests` route dispatches to filtered channels, while `HitlService.createException()` also dispatches to all channels internally. This can cause double notifications. Fix by either suppressing service-level dispatch or deduplicating
- [ ] **MFA enforcement on resolve**: `ApprovalRequest.routing.require_mfa` field exists in the type definition but is not enforced in the resolve route
