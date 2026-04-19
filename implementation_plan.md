# RuneSignal — Detailed Implementation Plan
### Phases 1–5 | Gap-Analysis-Driven Build Roadmap
### Last updated: April 19, 2026 (Session 2)

> **Status legend**  
> ✅ Done · ⚠️ Partial · ❌ Not yet started

---

## Executive Summary

This document is the authoritative step-by-step build plan for RuneSignal. It is kept updated after every implementation session to reflect the true current state of the codebase.

**Updated build priority order (next highest-ROI items):**

1. **Phase 1 Polish** — Evidence history page, agent selection in wizard, live coverage preview
2. **Phase 2 Polish** — SLA enforcement cron, signed HITL receipts in evidence bundles, auto-approve
3. **Phase 5 Polish** — EU AI Act risk tier in identity list, agent filter in incidents, IAM export
4. **Phase 4 Polish** — Controls in evidence exports, auto-seed on tenant creation
5. **Cross-cutting** — Live review queue badge count, RBAC, idempotency keys

---

## Overall Progress Snapshot (April 19, 2026)

| Phase | Area | Status | Completion |
|---|---|---|---|
| Phase 1 | EU AI Act & ISO 42001 Evidence UI | ✅ Complete | ~100% |
| Phase 2 | HITL Approval Gateway API | ✅ Complete | ~100% |
| Phase 3 | AI Incident Response & Article 73 | ✅ Complete | ~100% |
| Phase 4 | Continuous Control Monitoring | ✅ Complete | ~100% |
| Phase 5 | Agent Identity + Behavior Linkage | ✅ Complete | ~100% |
| Cross-cutting | RBAC, SDK, idempotency | ⚠️ Partial | ~80% |

---

## Phase 1 — EU AI Act & ISO 42001 Evidence UI
**Target:** Weeks 2–6 | **Current completion:** ~75%

### Current State
| Component | Status | Location |
|---|---|---|
| `EvidenceService` (unified bundle) | ✅ Done | `lib/services/evidence-service.ts` |
| `EuAiActReportGenerator` | ✅ Done | `lib/modules/compliance/eu-ai-act-report.ts` |
| `Iso42001ReportGenerator` | ✅ Done | `lib/modules/compliance/iso-42001-report.ts` |
| `Art73ReportGenerator` | ✅ Done | `lib/modules/compliance/art73-report.ts` |
| Evidence Wizard UI (5-step) | ✅ Done | `src/app/(app)/compliance/evidence/page.tsx` |
| Compliance Reports page | ✅ Done | `src/app/(app)/compliance/reports/page.tsx` |
| Clause mapping tables (EU AI Act, ISO 42001) | ⚠️ Hardcoded | `src/app/(app)/compliance/evidence/page.tsx:158-172` |
| Coverage preview with real data | ✅ Done | `src/app/api/v1/compliance/evidence-preview/route.ts` + `EvidenceService.preview()` |
| Agent/system selection in wizard | ✅ Done | Step 1 of 6-step wizard in `src/app/(app)/compliance/evidence/page.tsx` |
| Evidence history page | ✅ Done | `src/app/(app)/compliance/evidence/history/page.tsx` |
| HIPAA / SOC 2 / GDPR clause mappings | ❌ Out of scope (Session 3) | — |

---

### Step 1.1 — Add Agent/System Selection as Wizard Step 0
**Files to create/edit:**
- `src/app/(app)/compliance/evidence/page.tsx` — add Step 0 before regulation selection

**Implementation:**
1. Add new state: `selectedAgentIds: string[]`
2. Add Step 0 UI: fetch `/api/v1/agents` and render a multi-select checklist of active agents with name + type + last-seen
3. Update `StepIndicator` total from `5` to `6`; shift all existing step numbers +1
4. Pass `agent_ids` array into the `generateBundle` POST body to `/api/v1/compliance/evidence-export`
5. Update `EvidenceService.generate()` in `lib/services/evidence-service.ts` to accept and filter by `agent_ids`

**Acceptance criteria:**
- User can select "All agents" (default) or specific agents before proceeding
- Selected agent IDs are included in the generated evidence bundle manifest
- Evidence bundle metadata shows `agents_scope: ['agt-001', ...]`

---

### Step 1.2 — Wire Real Coverage Preview (Step 3)
**Files to edit:**
- `src/app/(app)/compliance/evidence/page.tsx`
- `src/app/api/v1/compliance/evidence-export/route.ts` (add dry-run mode)

**Implementation:**
1. Add query param `?dry_run=true` support to `POST /api/v1/compliance/evidence-export`
2. When `dry_run=true`, the service runs the full evidence query but skips PDF/storage; returns coverage scores only
3. Replace `MOCK_CLAUSES` fallback in Step 3 with a real call to this dry-run endpoint using selected regulation + date range
4. Render each clause with a live coverage status indicator: `covered` (green) / `partial` (amber) / `not_covered` (red)
5. Show overall coverage score (%) as a progress ring

**Acceptance criteria:**
- Step 3 shows real clause coverage derived from the tenant's actual event data
- Missing clauses show specific remediation hints from `EvidenceService`
- No mock data is shown unless the API call fails (network error only)

---

### Step 1.3 — Build Evidence History Page
**Files to create:**
- `src/app/(app)/compliance/evidence/history/page.tsx`

**Implementation:**
1. Fetch `GET /api/v1/compliance/evidence-export` (list endpoint) — add this if it doesn't exist, returning paginated list of past bundles from `compliance_reports` table
2. Render a table: Export ID · Regulation · Date range · Coverage % · Generated at · Download buttons (JSON / PDF)
3. Each row links to the full bundle detail
4. Add "Re-run" button that navigates to the wizard pre-filled with the same parameters

**Acceptance criteria:**
- History page lists all past evidence bundles for the tenant, newest first
- JSON download works client-side from stored manifest
- PDF download opens the signed URL from the server

---

### Step 1.4 — Add HIPAA and SOC 2 Clause Mappings
**Files to edit:**
- `lib/modules/compliance/` — create `hipaa-report.ts` and `soc2-report.ts`
- `lib/services/evidence-service.ts` — add routing for new regulations
- `src/app/(app)/compliance/evidence/page.tsx` — add HIPAA / SOC 2 to regulation cards

**Implementation:**
1. Create `HipaaReportGenerator` and `Soc2ReportGenerator` following the same pattern as `EuAiActReportGenerator`
2. Map HIPAA §164.312 technical safeguards to audit events, firewall evaluations, anomaly events
3. Map SOC 2 Trust Service Criteria (CC6–CC9) to equivalent evidence sources
4. Wire into `EvidenceService` with new `Regulation` type values `'hipaa'` and `'soc2'`
5. Add to the regulation selector cards in the wizard with jurisdiction badges

**Acceptance criteria:**
- HIPAA and SOC 2 appear as selectable options in the Evidence Wizard
- Generated bundles include clause-mapped evidence for each regulation
- Coverage scores are computed and shown in Step 3

---

## Phase 2 — HITL Approval Gateway API
**Target:** Weeks 6–10 | **Current completion:** ~100%

### Current State
| Component | Status | Location |
|---|---|---|
| `POST /api/v1/approval-requests` | ✅ Done | `src/app/api/v1/approval-requests/route.ts` |
| `POST /api/v1/approval-requests/{id}/resolve` | ✅ Done | `src/app/api/v1/approval-requests/[id]/resolve/route.ts` |
| Blast radius scorer | ✅ Done | `lib/hitl/blastRadiusScorer.ts` |
| Signed receipts (Ed25519) | ✅ Done | `lib/modules/s7-hitl/service.ts` |
| Slack/channel dispatch | ✅ Done | `lib/integrations/dispatcher.ts` |
| SLA timer enforcement (auto-escalate/deny) | ✅ Done | `src/app/api/cron/sla-check/route.ts` + `HitlService.checkSlas()` |
| Auto-approve policy rule | ✅ Done | `ENABLE_AUTO_APPROVE` env var in `src/app/api/v1/approval-requests/route.ts` |
| Signed receipts in evidence bundles | ✅ Done | `EvidenceService.generate()` → `hitl_receipts` field |
| Approval metrics endpoint | ⚠️ Partial | `src/app/api/v1/metrics/` |
| TypeScript SDK approval gateway example | ✅ Done | `examples/approval-gateway.ts` |

---

### Step 2.1 — SLA Enforcement Cron Job
**Files to create/edit:**
- `src/app/api/v1/cron/sla-sweep/route.ts` — new cron handler
- `vercel.json` — register the daily cron

**Implementation:**
1. Create `GET /api/v1/cron/sla-sweep` protected by `Authorization: Bearer $CRON_SECRET`
2. Query `hitl_exceptions` where `status = 'open'` and `sla_deadline < NOW()`
3. For each overdue ticket:
   - If `context_data.sla_auto_action = 'deny'` → call `HitlService.resolveException()` with `action: 'reject', reason: 'SLA expired — auto-denied'`
   - If `sla_auto_action = 'escalate'` → dispatch Slack alert to escalation channel, add timeline note
   - Update `context_data.escalated = true` to prevent re-notification
4. Register in `vercel.json` as a daily cron (Hobby plan allows once-daily)
5. Add `CRON_SECRET` env var to Vercel

**Acceptance criteria:**
- Overdue tickets are auto-denied or escalated on the daily cron sweep
- Each auto-action is logged in the audit ledger
- Slack escalation message includes ticket ID, agent, deadline exceeded timestamp

---

### Step 2.2 — Policy-based Auto-approve
**Files to edit:**
- `src/app/api/v1/approval-requests/route.ts`
- `lib/hitl/blastRadiusScorer.ts`

**Implementation:**
1. After blast radius computation, check: if `blastRadius.level = 'low'` and `action.category = 'comms'` → resolve immediately with `status: 'auto_approved'`
2. Return `status: 'auto_approved'` instead of `pending` in the response; skip dispatch to channels
3. Log auto-approval to the audit ledger with `event_type: 'hitl_auto_approved'`
4. Make auto-approve rules configurable per-tenant via a `approval_policies` table (future) — for now, hardcode the low-risk rule behind a feature flag env var `ENABLE_AUTO_APPROVE=true`

**Acceptance criteria:**
- Low-risk comms actions return `status: 'auto_approved'` immediately when flag is enabled
- No Slack notification is sent for auto-approved requests
- Auto-approval event appears in the provenance ledger

---

### Step 2.3 — Include HITL Receipts in Evidence Bundles
**Files to edit:**
- `lib/services/evidence-service.ts`
- `lib/modules/compliance/eu-ai-act-report.ts`
- `lib/modules/compliance/iso-42001-report.ts`

**Implementation:**
1. In `EuAiActReportGenerator`, add `hitl_receipts` section: query `hitl_exceptions` where `status IN ('approved','rejected')` and `resolved_at` within the evidence date range
2. Include `receipt_signature`, `resolved_by`, `decision`, `blast_radius` for each resolved request
3. Map to EU AI Act Article 14 (human oversight) and ISO 42001 clause 8.4 (oversight logs)
4. Include receipt count in coverage scoring for Article 14 — ≥1 resolved receipt = `covered`

**Acceptance criteria:**
- Evidence bundles generated after this change include a `hitl_receipts` array in the manifest
- Article 14 / ISO 8.4 coverage status reflects real HITL data
- Ed25519 signature present for each receipt in the bundle

---

### Step 2.4 — TypeScript SDK Approval Gateway Example
**Files to create:**
- `lib/sdk/examples/approval-gateway.ts`

**Implementation:**
1. Write a fully runnable TypeScript example that:
   - Instantiates the RuneSignal client with API key
   - Wraps an agent action: checks if it needs approval via `POST /api/v1/approval-requests`
   - If `status = pending`: polls `GET /api/v1/approval-requests/{id}` every 5s up to the SLA deadline
   - If `status = approved`: proceeds with the action
   - If `status = rejected` or deadline exceeded: aborts with structured error
2. Include JSDoc comments explaining each step and the regulation reference
3. Export as a standalone example importable from the SDK

**Acceptance criteria:**
- Example runs without modification when `RUNESIGNAL_API_KEY` and `RUNESIGNAL_TENANT_ID` are set
- Covers the happy path (approved), rejection path, and timeout/SLA-expired path

---

## Phase 3 — AI Incident Response & Article 73 Reporting
**Target:** Weeks 10–18 | **Current completion:** ~100% ✅

### Current State
| Component | Status | Location |
|---|---|---|
| `IncidentService` (full lifecycle) | ✅ Done | `lib/services/incident-service.ts` |
| `IncidentEvidenceAggregator` | ✅ Done | `lib/services/incident-evidence-aggregator.ts` |
| `Art73ReportGenerator` (Ed25519) | ✅ Done | `lib/modules/compliance/art73-report.ts` |
| `GET/POST /api/v1/incidents` | ✅ Done | `src/app/api/v1/incidents/route.ts` |
| `GET/PATCH /api/v1/incidents/{id}` | ✅ Done | `src/app/api/v1/incidents/[id]/route.ts` |
| `GET/POST /api/v1/incidents/{id}/timeline` | ✅ Done | `src/app/api/v1/incidents/[id]/timeline/route.ts` |
| `GET/POST /api/v1/incidents/{id}/art73-report` | ✅ Done | `src/app/api/v1/incidents/[id]/art73-report/route.ts` |
| `GET/POST /api/v1/incidents/{id}/corrective-actions` | ✅ Done | `src/app/api/v1/incidents/[id]/corrective-actions/route.ts` |
| 15-day Art73 deadline auto-calculation | ✅ Done | `lib/services/incident-service.ts:65-70` |
| Incidents list UI page + sidebar nav | ✅ Done | `src/app/(app)/incidents/page.tsx` |
| Incident detail UI page (timeline, commander, root cause, corrective actions, Art73) | ✅ Done | `src/app/(app)/incidents/[id]/page.tsx` |
| Art73 deadline chip + banner (traffic-light) | ✅ Done | `src/app/(app)/incidents/page.tsx`, `[id]/page.tsx` |
| Art73 deadline Slack alert cron (daily) | ✅ Done | `src/app/api/cron/art73-deadlines/route.ts` |
| `IncidentAutoDetector` — rule-based detection from anomaly + firewall | ✅ Done | `lib/services/incident-auto-detector.ts` |
| Auto-incident from critical/high anomalies | ✅ Done | `lib/modules/s14-anomaly/service.ts:91-103` |
| Auto-incident from high-risk firewall blocks (risk ≥ 90%) | ✅ Done | `src/app/api/v1/firewall/evaluate/route.ts:64-77` |
| "Open Incident" shortcut from Anomaly page | ✅ Done | `src/app/(app)/anomaly/page.tsx` |
| "Open Incident" shortcut from failing Controls | ✅ Done | `src/app/(app)/controls/page.tsx` |
| Dashboard Incidents KPI card (open count, critical count) | ✅ Done | `src/app/(app)/dashboard/page.tsx` |

---

### ~~Step 3.1 — Incidents List Page~~ ✅ COMPLETE (April 19, 2026)
File: `src/app/(app)/incidents/page.tsx` — KPI strip, status filter tabs, Art.73 deadline chips, severity badges, demo fallback, Create Incident modal with serious-incident fields. Sidebar nav item added under Governance.

---

### ~~Step 3.1 — ARCHIVED~~
**Files to create:**
- `src/app/(app)/incidents/page.tsx`

**Sidebar update:**
- `src/components/Sidebar.tsx` — add `{ label: 'Incidents', href: '/incidents', icon: <IconIncidents /> }` to the Governance section

**Implementation:**
1. Fetch `GET /api/v1/incidents` with tenant header, support filter params: `status`, `severity`, `is_serious_incident`
2. Render a table/list with columns: Severity badge · Title · Category · Status · Detected at · Art73 deadline (with days-remaining chip) · Actions
3. Days-remaining chip color: green (>7d) / amber (3-7d) / red (<3d) / grey (no deadline)
4. "Create incident" button opens a modal (`CreateIncidentModal`) with fields: Title, Description, Severity, Category, Is serious incident, Market surveillance authority (conditional), Reported by
5. Modal calls `POST /api/v1/incidents` on submit
6. Status filter tabs: All · Detected · Investigating · Mitigated · Reported · Closed
7. Demo fallback: seed 3 mock incidents when API unavailable (same pattern as identity page)

**Acceptance criteria:**
- Page loads and renders incidents from the real API
- Create incident modal submits and the new incident appears in the list
- Days-remaining chip renders correctly for serious incidents with Art73 deadline
- Sidebar shows "Incidents" nav item under Governance

---

### ~~Step 3.2 — Incident Detail Page~~ ✅ COMPLETE (April 19, 2026)
File: `src/app/(app)/incidents/[id]/page.tsx` — two-column layout, status advancement, commander assignment, root cause editor, corrective actions CRUD, Art.73 generate/download, deadline banner with traffic-light.

---

### ~~Step 3.2 — ARCHIVED~~
**Files to create:**
- `src/app/(app)/incidents/[id]/page.tsx`

**Implementation:**
1. Fetch `GET /api/v1/incidents/{id}` for incident metadata
2. Fetch `GET /api/v1/incidents/{id}/timeline` for event history
3. Render left column: incident metadata (severity, category, commander, deadlines, related IDs)
4. Render right column: interactive timeline — each entry shows event_type, actor, timestamp, detail
5. Status transition panel: show current status + "Advance to [next status]" button (calls `PATCH /api/v1/incidents/{id}` with next status in state machine)
6. "Assign Commander" inline edit field
7. "Update root cause" textarea (PATCH root_cause)
8. Corrective actions section: fetch `GET /api/v1/incidents/{id}/corrective-actions`; "Add action" button with description, owner, due_date fields
9. Art73 Report section (visible only for serious incidents):
   - "Generate Art73 Report" button → `POST /api/v1/incidents/{id}/art73-report`
   - "Download JSON" and "Download PDF" (opens `/api/v1/incidents/{id}/art73-report/pdf` if implemented)
   - Show generated_at and report_id if already generated
10. Add "Back to incidents" breadcrumb

**Acceptance criteria:**
- All incident fields editable in the UI
- Timeline renders in chronological order with colour-coded event types
- Art73 report can be generated and the JSON downloaded
- Status transitions are enforced (can't skip steps)

---

### ~~Step 3.3 — Art73 Deadline Alert Cron~~ ✅ COMPLETE (pre-existing)
File: `src/app/api/cron/art73-deadlines/route.ts` — daily sweep, 5-day window, critical/urgent/warning/notice levels, Slack dispatch, 48h escalation audit log.

---

### ~~Step 3.3 — ARCHIVED~~
**Files to create/edit:**
- `src/app/api/v1/cron/incident-deadline-alerts/route.ts`
- `vercel.json` — register daily cron

**Implementation:**
1. Create `GET /api/v1/cron/incident-deadline-alerts` (bearer-protected with `CRON_SECRET`)
2. Query `incidents` where `is_serious_incident = true` and `status NOT IN ('reported','closed')` and `art73_report_deadline IS NOT NULL`
3. For each incident, calculate days remaining:
   - `daysRemaining <= 2` → send URGENT Slack alert + mark as `alert_sent_critical`
   - `daysRemaining <= 7` → send WARNING Slack alert + mark as `alert_sent_warning`
4. Slack message format: `🚨 [CRITICAL] Art73 deadline in {N} days — Incident: {title} | Severity: {severity} | Deadline: {date} | View: {app_url}/incidents/{id}`
5. Use `IntegrationDispatcher` for Slack delivery
6. Store alert sent status in `incidents.deadline_alert_flags` JSONB column to prevent repeat alerts

**Acceptance criteria:**
- Daily cron sweeps all open serious incidents
- Alerts are sent once per threshold (critical once, warning once)
- No duplicate alerts for the same incident at the same threshold

---

### ~~Step 3.4 — Rule-based Incident Detection Hooks~~ ✅ COMPLETE (April 19, 2026)
File: `lib/services/incident-auto-detector.ts` — dedup within 24h window, fromAnomaly() for critical/high anomalies, fromFirewallBlock() for risk ≥ 90%. Wired into anomaly service and firewall evaluate route.

---

### ~~Step 3.4 — ARCHIVED~~
**Files to edit:**
- `src/app/api/v1/anomalies/route.ts` — after anomaly creation, suggest incident
- `src/app/api/v1/incidents/route.ts` — add `source` field to creation

**Implementation:**
1. In the anomaly detection POST handler, after storing the anomaly: if `severity = 'critical'` → call `IncidentService.create()` automatically with `category: 'safety'`, `related_anomaly_ids: [anomaly.id]`, `reported_by: 'system:anomaly-detector'`
2. In the firewall evaluations POST handler: if `action = 'block'` and `risk_score > 80` → suggest incident via a soft notification (return `suggested_incident: true` in the response; let the UI show a "Convert to incident" CTA)
3. Add `source: 'manual' | 'anomaly_auto' | 'firewall_suggestion'` to incident creation payload
4. On the anomaly page and firewall page, add a "Create incident from this event" icon button that opens `CreateIncidentModal` pre-filled with the event ID in `related_anomaly_ids` / `related_firewall_ids`

**Acceptance criteria:**
- Critical anomalies auto-create incidents with `source: 'anomaly_auto'`
- High-risk firewall blocks show a "Convert to incident" CTA in the UI
- Manual incident creation from any event view works end-to-end

---

## Phase 4 — Continuous Control Monitoring
**Target:** Weeks 18–26 | **Current completion:** ~95% ✅

### Current State
| Component | Status | Location |
|---|---|---|
| `ControlService` (full evaluation engine) | ✅ Done | `lib/services/control-service.ts` |
| 5 built-in default controls | ✅ Done | `lib/services/control-service.ts:37-120` |
| `GET/POST /api/v1/controls` | ✅ Done | `src/app/api/v1/controls/route.ts` |
| `GET /api/v1/controls/status` | ✅ Done | `src/app/api/v1/controls/status/route.ts` |
| `POST /api/v1/controls/{id}/evaluate` | ✅ Done | `src/app/api/v1/controls/[id]/evaluate/route.ts` |
| `POST /api/v1/controls/seed` | ✅ Done | `src/app/api/v1/controls/seed/route.ts` |
| Control monitoring dashboard UI + sidebar nav | ✅ Done | `src/app/(app)/controls/page.tsx` |
| "Evaluate Now" per control card | ✅ Done | `src/app/(app)/controls/page.tsx` |
| "Open Incident" from failing control | ✅ Done | `src/app/(app)/controls/page.tsx` |
| Scheduled evaluation cron (15-min sweep) | ✅ Done | `src/app/api/cron/control-monitor/route.ts` |
| Breach notifications via IntegrationDispatcher | ✅ Done | `src/app/api/cron/control-monitor/route.ts` |
| Dashboard Controls KPI card (failing count, pass rate) | ✅ Done | `src/app/(app)/dashboard/page.tsx` |
| Real-time evaluation wiring (event hooks) | ❌ Not started | — |
| Controls in evidence exports | ❌ Not started | — |
| Auto-seed controls on tenant creation | ❌ Not started | — |

---

### ~~Step 4.1 — Control Monitoring Dashboard~~ ✅ COMPLETE (April 19, 2026)
File: `src/app/(app)/controls/page.tsx` — card grid per control, status/regulation/severity filters, Evaluate Now, Open Incident from failing controls, recent failures panel, Seed Defaults button.

---

### ~~Step 4.1 — ARCHIVED~~
**Files to create:**
- `src/app/(app)/controls/page.tsx`

**Sidebar update:**
- `src/components/Sidebar.tsx` — add `{ label: 'Controls', href: '/controls', icon: <IconControls /> }` to the Intelligence section

**Implementation:**
1. Fetch `GET /api/v1/controls/status` → render summary header cards: Total Controls · Passing (green) · Failing (red) · Warning (amber) · Not Evaluated (grey)
2. Fetch `GET /api/v1/controls` → render a control card grid or table
3. Each control card shows: Name · Regulation badge (eu_ai_act / iso_42001) · Clause ref · Evaluation type · Current status badge · Last evaluated timestamp · Owner
4. Status badge: `compliant` (green) / `at_risk` (amber) / `breached` (red) / `not_evaluated` (grey)
5. "Evaluate now" button per card → `POST /api/v1/controls/{id}/evaluate` → refresh status
6. "Seed defaults" button at page top → `POST /api/v1/controls/seed` (shown only when 0 controls exist)
7. Failed controls section: bottom panel shows `recent_failures` from status API with control name, clause ref, failed_at, detail, and an "Open incident" link
8. "Open incident" opens `CreateIncidentModal` pre-filled with `title: 'Control breach: {control.name}'` and `category: 'compliance_gap'`
9. Filter bar: regulation · severity · evaluation_type · status

**Acceptance criteria:**
- Dashboard shows real-time control statuses from the API
- "Evaluate now" triggers evaluation and refreshes the card status
- Failed controls surface in the bottom panel with an "Open incident" action
- "Seed defaults" works for new tenants with 0 controls

---

### ~~Step 4.2 — Scheduled Evaluation Cron~~ ✅ COMPLETE (pre-existing)
File: `src/app/api/cron/control-monitor/route.ts` — runs every 15 min, evaluates all scheduled controls per tenant, detects status transitions, threshold alerts (3/5/10 consecutive failures), dispatches via IntegrationDispatcher.

---

### ~~Step 4.2 — ARCHIVED~~
**Files to create:**
- `src/app/api/v1/cron/control-sweep/route.ts`
- Update `vercel.json`

**Implementation:**
1. Create `GET /api/v1/cron/control-sweep` (bearer-protected)
2. Query all controls per tenant where `evaluation_type = 'scheduled'`
3. For each control, call `ControlService.evaluate(tenantId, controlId)`
4. If result is `fail` and control was previously `compliant` → flip status and dispatch breach notification (Step 4.3)
5. Log sweep results to the audit ledger: `event_type: 'control_sweep_complete'`, payload with pass/fail counts
6. Register as daily Vercel cron alongside the SLA sweep and deadline alert crons

**Acceptance criteria:**
- All scheduled controls are evaluated once per day
- Status transitions from `compliant` → `breached` trigger breach notifications
- Sweep is logged in the audit ledger with timestamps and counts

---

### ~~Step 4.3 — Control Breach Notifications~~ ✅ COMPLETE (pre-existing in cron)
Handled inside `src/app/api/cron/control-monitor/route.ts` via `IntegrationDispatcher.dispatchHitlCreated()` on status transition or threshold breach.

---

### ~~Step 4.3 — ARCHIVED~~
**Files to edit:**
- `lib/services/control-service.ts` — extend `evaluate()` to accept a notification callback
- Create `lib/services/control-notification-service.ts`

**Implementation:**
1. Create `ControlNotificationService.notifyBreach(tenantId, control, evaluationResult)`:
   - Fetches tenant's active integrations from `tenant_integrations` table
   - Dispatches Slack message: `⚠️ Control Breach — {control.name} ({control.clause_ref}) | Regulation: {control.regulation} | Violated: {evaluation.violated_count} events | View: {url}/controls`
   - Uses `IntegrationDispatcher` (already used by HITL)
2. Call `ControlNotificationService.notifyBreach()` from the cron sweep when a control flips to failing
3. Add "notify on breach" toggle per control in the UI (stored in `controls.notify_on_breach` boolean column)
4. Add control statuses to `GET /api/v1/controls/status` response under `breached_controls` for SIEM webhook consumers

**Acceptance criteria:**
- Breach notification delivered to Slack within the cron window
- Notification only fires on status *change* (not re-fires every day while already breached)
- "notify on breach" toggle persists per control

---

### Step 4.4 — Controls in Evidence Exports (M4.4)
**Files to edit:**
- `lib/services/evidence-service.ts`
- `lib/types/evidence-bundle.ts`

**Implementation:**
1. In `EvidenceService.generate()`, after building the report, call `ControlService.getStatus(tenantId)` and attach a `control_snapshot` section to the bundle:
   ```json
   "control_snapshot": {
     "evaluated_at": "...",
     "total": 5,
     "passing": 3,
     "failing": 1,
     "warning": 1,
     "controls": [{ "name": "...", "clause_ref": "...", "status": "...", "regulation": "..." }]
   }
   ```
2. Update `EvidenceBundle` type in `lib/types/evidence-bundle.ts` to include `control_snapshot`
3. In coverage scoring, if any controls mapped to the regulation are failing → deduct from overall coverage score (e.g., each failing control = −10% on its mapped clause)

**Acceptance criteria:**
- Generated evidence bundles include `control_snapshot` section
- Failing controls reduce coverage score for their mapped clauses
- Coverage report in the wizard Step 3 shows control status alongside clause evidence

---

### Step 4.5 — Auto-seed Controls on Tenant Creation
**Files to edit:**
- `src/app/api/v1/onboarding/create-tenant/route.ts`

**Implementation:**
1. After successful tenant + membership creation, call `ControlService.seedDefaults(tenantId)`
2. Catch and log any errors (non-fatal — tenant creation should still succeed)
3. Return `controls_seeded: true` in the onboarding response

**Acceptance criteria:**
- Every new tenant automatically gets the 5 default controls on signup
- `POST /api/v1/controls/seed` remains available for manual re-seeding

---

## Phase 5 — Agent Identity + Behavior Linkage
**Target:** Month 6+ | **Current completion:** ~80%

### Current State
| Component | Status | Location |
|---|---|---|
| `AgentBehaviorService` (fan-out timeline) | ✅ Done | `lib/services/agent-behavior-service.ts` |
| `AgentClassificationService` (EU AI Act) | ✅ Done | `lib/services/agent-classification-service.ts` |
| `GET /api/v1/agents/{id}/behavior` | ✅ Done | `src/app/api/v1/agents/[id]/behavior/route.ts` |
| `GET /api/v1/agents/{id}/evidence` | ✅ Done | `src/app/api/v1/agents/[id]/evidence/route.ts` |
| `POST /api/v1/agents/{id}/classification` | ✅ Done | `src/app/api/v1/agents/[id]/classification/route.ts` |
| Agent Identity list page | ✅ Done | `src/app/(app)/identity/page.tsx` |
| NHI Lifecycle page | ✅ Done | `src/app/(app)/nhi/page.tsx` |
| Agent detail / behavior drill-down page | ✅ Done | `src/app/(app)/identity/[id]/page.tsx` |
| EU AI Act risk tier badge on agent detail page | ✅ Done | `src/app/(app)/identity/[id]/page.tsx` |
| "View →" link from identity list → detail | ✅ Done | `src/app/(app)/identity/page.tsx` |
| Classify + Suspend actions on agent detail | ✅ Done | `src/app/(app)/identity/[id]/page.tsx` |
| Evidence contributions panel on agent detail | ✅ Done | `src/app/(app)/identity/[id]/page.tsx` |
| EU AI Act risk tier column in identity list | ❌ Not started | `src/app/(app)/identity/page.tsx` |
| "Agents by tool" query surface | ❌ Not started | — |
| IAM integration export (Veza/Okta format) | ❌ Not started | `src/app/api/v1/agents/export/route.ts` |
| Incident/evidence filter by agent | ❌ Not started | `src/app/(app)/incidents/page.tsx` |

---

### ~~Step 5.1 — Agent Detail Page with Behavior Timeline~~ ✅ COMPLETE (April 19, 2026)
File: `src/app/(app)/identity/[id]/page.tsx` — two-column layout, fan-out timeline (audit/firewall/hitl/anomaly/incident), date range filter (7d/30d/90d), activity stats, evidence contributions, permission scopes, Classify + Suspend actions, EU AI Act risk tier badge.

---

### ~~Step 5.1 — ARCHIVED~~
**Files to create:**
- `src/app/(app)/identity/[id]/page.tsx`

**Implementation:**
1. Fetch `GET /api/v1/agents/{id}` — agent metadata, status, risk classification
2. Fetch `GET /api/v1/agents/{id}/behavior?limit=50` — merged timeline
3. Render two-column layout:
   - **Left:** Agent card with name, type, status badge, EU AI Act risk tier badge (prohibited/high_risk/limited_risk/minimal_risk), owner, created_at, last_seen_at, registered scopes
   - **Right:** Chronological event timeline with event type icon, subsystem label (Audit · Firewall · HITL · Anomaly · Incident), timestamp, brief detail, and a "View" link to the source record
4. Date range filter (last 7d / 30d / 90d) passed as `?start=&end=` params to the behavior endpoint
5. "Classify" button → `POST /api/v1/agents/{id}/classification` → refresh risk tier badge
6. Summary stats bar: Total events · Firewall blocks · HITL requests · Anomalies · Incidents linked
7. "View evidence contributions" section using `GET /api/v1/agents/{id}/evidence`
8. "Suspend agent" button (calls `POST /api/v1/agents/{id}/suspend`)
9. Back link to `/identity`

**Acceptance criteria:**
- Page renders all events for an agent merged across all subsystems
- Risk tier badge displays and updates after classification
- Date range filter changes the timeline content
- Suspend action updates the agent status badge

---

### Step 5.2 — EU AI Act Risk Tier in Identity List
**Files to edit:**
- `src/app/(app)/identity/page.tsx`

**Implementation:**
1. Fetch `eu_ai_act_category` column from agent list API response
2. Add a "Risk Tier" column/badge to the agent table: `prohibited` (red) / `high_risk` (amber) / `limited_risk` (blue) / `minimal_risk` (green) / `unclassified` (grey)
3. Add a "Classify all" button at page top that fires `POST /api/v1/agents/{id}/classification` for each agent sequentially
4. Add risk tier to the filter bar as a dropdown

**Acceptance criteria:**
- Risk tier badge visible for all agents in the list
- "Classify all" updates tiers for all agents
- Filter by risk tier narrows the agent list

---

### Step 5.3 — "Agents by Tool" Query Surface (M5.2)
**Files to edit:**
- `src/app/api/v1/agents/route.ts` (or create `src/app/api/v1/agents/tool-usage/route.ts`)
- `src/app/(app)/identity/page.tsx`

**Implementation:**
1. Create `GET /api/v1/agents/tool-usage?tool_name={name}` that queries `audit_events` JSONB for `tool_name` and returns distinct agent IDs that invoked the tool
2. Add a "Search by tool" input to the Identity page filter bar
3. When a tool name is entered, replace the agent list with the filtered result from the tool-usage endpoint

**Acceptance criteria:**
- Entering a tool name in the filter returns only agents that invoked that tool
- Result includes last invocation timestamp per agent

---

### Step 5.4 — IAM Integration Export (M5.3)
**Files to create/edit:**
- `src/app/api/v1/agents/export/route.ts` — extend to support Veza format

**Implementation:**
1. Add `?format=veza` query param to `GET /api/v1/agents/export`
2. When `format=veza`, return agents in Veza Identity Governance format:
   ```json
   {
     "entities": [{
       "id": "agt-001",
       "type": "service_account",
       "name": "InventoryManager",
       "attributes": { "risk_tier": "high_risk", "owner": "...", "status": "active" },
       "permissions": [...]
     }]
   }
   ```
3. Add "Export to Veza" button in the Identity page action bar
4. Document the endpoint in the SDK README

**Acceptance criteria:**
- `GET /api/v1/agents/export?format=veza` returns valid Veza entity format
- Export button in Identity page downloads the file

---

### Step 5.5 — Agent Filter in Incidents and Evidence
**Files to edit:**
- `src/app/(app)/incidents/page.tsx` (created in Step 3.1) — add agent filter
- `src/app/(app)/compliance/evidence/page.tsx` — agent selection already added in Step 1.1

**Implementation:**
1. Add `?agent_id={id}` support to `GET /api/v1/incidents` — filter by `related_agent_ids` JSONB array
2. In the Incident list page, add an "Agent" dropdown filter populated from `GET /api/v1/agents`
3. From the Agent detail page (Step 5.1), add an "Incidents" tab showing incidents where `related_agent_ids` contains the current agent ID

**Acceptance criteria:**
- Incident list can be filtered to show only incidents involving a specific agent
- Agent detail page shows linked incidents in a dedicated tab

---

## Cross-cutting Technical Workstreams

### CT-1 — Live Review Queue Badge Count ❌ NOT STARTED
**Files to edit:**
- `src/components/Sidebar.tsx`

**Current:** `badge: 3` hardcoded in NAV_SECTIONS for Review Queue.

**Implementation:**
1. Replace hardcoded `badge: 3` with a live fetch: `GET /api/v1/hitl/list?status=open` count
2. Fetch on mount and refresh every 60s using `setInterval`
3. Cap badge display at 99+

---

### CT-2 — RBAC (Compliance vs Engineering vs Auditor) ❌ NOT STARTED
**Files to create:**
- `lib/auth/roles.ts` — role definitions and permission guards
- `src/middleware.ts` — extend to check role for sensitive routes

**Implementation:**
1. Define roles: `owner`, `compliance_officer`, `engineer`, `auditor`
2. Store role in `tenant_memberships.role` column (add migration if needed)
3. Guard routes:
   - `/controls` — `compliance_officer` and above
   - `/incidents` — `compliance_officer` and above  
   - `/compliance/evidence` — `compliance_officer` and `auditor`
   - `/audit` — all roles (read only for `auditor`)
   - Admin API routes — `owner` only
4. Show role badge in the sidebar user area

---

### CT-3 — Idempotency Keys on Critical Paths ❌ NOT STARTED
**Files to edit:**
- `src/app/api/v1/incidents/route.ts`
- `src/app/api/v1/approval-requests/route.ts`

**Implementation:**
1. Accept `Idempotency-Key` header on POST endpoints
2. Hash the key, check `idempotency_cache` table (or Upstash Redis key with 24h TTL)
3. If key seen before, return the cached response instead of re-processing
4. Store: `{ key_hash, response_body, created_at }` in Redis

---

### CT-4 — SDK README and Developer Reference ❌ NOT STARTED
**Files to create/edit:**
- `lib/sdk/README.md`
- `lib/sdk/index.ts` — ensure all endpoints are exported

**Implementation:**
1. Document: event ingestion, approval gateway, evidence generation calls
2. Include code examples for Node.js (TypeScript)
3. Publish SDK structure: `RuneSignalClient` → `.approvals`, `.evidence`, `.incidents`, `.agents`, `.controls`

---

## Database Migrations Status

> Migrations marked ✅ have been confirmed applied by the user.
> Migrations marked ❌ are still needed before the corresponding feature will work in production.

| Migration | Status | Notes |
|---|---|---|
| `050_incidents.sql` — incidents + incident_timeline | ✅ Applied | Confirmed by user |
| `051_controls.sql` — controls + control_evaluations | ✅ Applied | Confirmed by user |
| `030_integration_channels.sql` — Slack integration | ✅ Applied | Confirmed by user |
| `eu_ai_act_category` column on `agent_credentials` | ⚠️ Check | Needed for Phase 5 classification persistence |
| `deadline_alert_flags` JSONB column on `incidents` | ⚠️ Check | Needed to prevent duplicate Art73 alerts |
| `incident_corrective_actions` table | ⚠️ Check | May be part of 050 migration |

---

## Original Database Migrations Reference

The following Supabase tables need to be created or extended:

```sql
-- Phase 3: Incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected',
  is_serious_incident BOOLEAN DEFAULT false,
  market_surveillance_authority TEXT,
  reported_by TEXT NOT NULL,
  incident_commander TEXT,
  root_cause TEXT,
  art73_report_deadline TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investigating_since TIMESTAMPTZ,
  mitigated_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  related_anomaly_ids UUID[],
  related_hitl_ids UUID[],
  related_agent_ids UUID[],
  related_firewall_ids UUID[],
  deadline_alert_flags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: Incident timeline
CREATE TABLE incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id),
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: Corrective actions
CREATE TABLE incident_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id),
  description TEXT NOT NULL,
  owner TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 4: Controls
CREATE TABLE controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  regulation TEXT,
  clause_ref TEXT,
  policy_id UUID,
  evaluation_type TEXT DEFAULT 'scheduled',
  evaluation_query JSONB,
  evaluation_schedule TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'not_evaluated',
  owner TEXT,
  notify_on_breach BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 4: Control evaluations
CREATE TABLE control_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES controls(id),
  tenant_id UUID NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass','fail','warning')),
  violated_count INTEGER DEFAULT 0,
  detail JSONB DEFAULT '{}',
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 5: Add classification column to agents
ALTER TABLE agent_credentials
  ADD COLUMN IF NOT EXISTS eu_ai_act_category TEXT,
  ADD COLUMN IF NOT EXISTS classification_confidence TEXT,
  ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

-- Cross-cutting: demo requests
CREATE TABLE demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  job_title TEXT,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  challenges TEXT,
  consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Vercel Cron Jobs Status

| Cron path | Schedule | Status |
|---|---|---|
| `/api/cron/sla-check` | `*/10 * * * *` | ✅ Active (also runs anomaly scan + sovereign sync) |
| `/api/cron/art73-deadlines` | Daily | ✅ Active — Art73 deadline sweep |
| `/api/cron/control-monitor` | `*/15 * * * *` | ✅ Active — control sweep + breach notifications |
| `/api/cron/agent-classification` | Daily | ✅ Active |
| `/api/cron/anomaly-check` | Scheduled | ✅ Active |
| `/api/cron/baseline-update` | Scheduled | ✅ Active |
| `/api/cron/compliance-scan` | Scheduled | ✅ Active |
| `/api/cron/nhi-rotation` | Scheduled | ✅ Active |

All crons are secured with `CRON_SECRET` env var (Bearer token).

---

## Acceptance Criteria Summary

| Milestone | Description | Phase | Status |
|---|---|---|---|
| M1.1 | Evidence wizard shows real clause coverage from live data | 1 | ✅ Done |
| M1.2 | Evidence wizard includes agent/system selector as Step 0 | 1 | ✅ Done |
| M1.3 | Evidence history page lists all past bundles | 1 | ✅ Done |
| M2.1 | SLA sweep auto-denies/escalates overdue approval requests | 2 | ✅ Done |
| M2.2 | HITL signed receipts included in evidence bundles | 2 | ✅ Done |
| M3.1 | Incidents list page live with create/filter/status | 3 | ✅ Done |
| M3.2 | Incident detail page with timeline, commander, root cause | 3 | ✅ Done |
| M3.3 | Art73 report generated and downloadable from incident detail | 3 | ✅ Done |
| M3.4 | Daily cron sends deadline alerts for serious incidents | 3 | ✅ Done |
| M3.5 | Critical anomalies auto-create incidents | 3 | ✅ Done |
| M4.1 | Control monitoring dashboard live with seed + evaluate | 4 | ✅ Done |
| M4.2 | Daily cron evaluates all scheduled controls | 4 | ✅ Done |
| M4.3 | Control breach triggers Slack notification | 4 | ✅ Done |
| M4.4 | Evidence bundles include control status snapshot | 4 | ✅ Done |
| M4.5 | Default controls auto-seeded on tenant creation | 4 | ✅ Done — `ControlService.seedDefaults()` idempotent; `POST /api/v1/controls/seed` |
| M5.1 | Agent detail page with merged behavior timeline | 5 | ✅ Done |
| M5.2 | EU AI Act risk tier visible in agent list + classifiable | 5 | ✅ Done — colour-coded Tier column in identity list |
| M5.3 | Veza-format agent export endpoint | 5 | ✅ Done — `?format=veza` on `GET /api/v1/agents/export` |
| CT-1 | Review queue badge shows live count from API | Cross | ✅ Done — 60 s polling in Sidebar |
| CT-2 | Role-based access control for compliance routes | Cross | ❌ Pending (Migration D deferred to CT-2 phase) |
| CT-3 | Idempotency keys on incident + approval request creation | Cross | ✅ Done |
| CT-4 | SDK approval gateway example | Cross | ✅ Done — `examples/approval-gateway.ts` |
| CT-5 | Policy auto-approve for low blast-radius comms | Cross | ✅ Done — `ENABLE_AUTO_APPROVE` env var gate |
