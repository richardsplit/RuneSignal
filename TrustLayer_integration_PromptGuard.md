INTEGRATION BRIEF

PromptGuard Enterprise

× TrustLayer

Integration Architecture, Corporate Enterprise Concept & Master Build Prompt

Platform	TrustLayer - Enterprise AI Governance Platform (Next.js 16, Supabase, Ed25519, pgvector)
Extension	PromptGuard - AI Agent Identity, Moral Profile & Manager-RoboDeveloper Security Layer
Relationship	PromptGuard as a native TrustLayer module (S8 - MoralOS), not a separate product
Date	April 2026
Status	Concept + Build Prompt - Ready for Claude Code / Opus 4.6 implementation
Part 1: TrustLayer - What You Built
TrustLayer is a cryptographic AI governance control plane for enterprises. Based on the codebase review, it currently implements five production modules:

S3 - Provenance	Cryptographic hashing & Ed25519 signing of all LLM I/O. SHA-256 certificates. Immutable audit ledger in Supabase. Drop-in ATPClient SDK wrapping OpenAI & Anthropic.
S6 - Identity	Agent credential registry. RS256 JWT issuance. Typed PermissionScope enforcement. MCP proxy layer validating tool calls against scopes.
S1 - Conflict	pgvector semantic intent arbiter. Detects multi-agent collisions using cosine similarity. Claude/OpenAI-powered deep mediation. Policy engine: BLOCK / QUEUE / ALERT.
S7 - HITL	Human-in-the-loop exception routing. SLA tiers (15m critical → 24h low). Slack webhook escalation. Full state machine (Open → In Review → Resolved).
S5 - Insurance	Actuarial risk scoring (0-100) from agent telemetry. Dynamic premium multipliers (up to 3.0×). Coverage limits per risk profile.
Tech stack: Next.js 16 App Router, Supabase (PostgreSQL 15, pgvector, RLS), Ed25519 Web Crypto, @panva/jose, Upstash Redis rate limiting, Vercel deployment.

Part 2: PromptGuard Enterprise - The New Concept
PromptGuard adds two capabilities that TrustLayer currently does not have:

Layer 1 - Security Identity (Father/Son Trust Hierarchy)

The Manager (human, Father node) is the only verified prompt authority for their domain.
All external inputs - web pages, emails, third-party APIs, plugins - are classified as data, never as commands.
Out-of-band (OOB) push/SMS approval is required before sensitive actions execute.
Prompt injection is structurally blocked before it reaches the LLM reasoning layer.
Layer 2 - Moral Identity (Corporate SOUL.md)

Every agent carries a SOUL.md - a cryptographically signed moral profile of the company.
The SOUL encodes: financial thresholds, compliance rules (GDPR/HIPAA/SOC2), data classification, security policies, team authority chains, training gates.
Even with full permissions granted, the agent pauses and escalates if an action conflicts with the SOUL profile.
The Corporate SOUL is set at org level (board-authorized), scoped to departments, and refined continuously through approved/rejected action feedback.
Manager-RoboDeveloper Model

AI agents are deployed as real team members with domain-specific roles: Finance, Compliance, Engineering, Security, Training, Ops.
Each RoboDeveloper operates within both Manager authority AND the Corporate SOUL - simultaneously.
Managers can delegate within their scope but cannot override the Corporate SOUL.
Part 3: Integration Recommendation
Recommendation: PromptGuard as Module S8 - MoralOS
PromptGuard should be built as a native TrustLayer module, not a standalone product. Here's why:

Shared Infrastructure	TrustLayer already has Ed25519 signing (LedgerSigner), JWT identity (S6), HITL approval routing (S7), and audit ledger - all of which PromptGuard needs. Building separately would duplicate all of this.
Natural Extension	S6 registers agents. S8 adds the moral profile to each registered agent. S7 routes HITL approvals. S8 adds a second OOB moral-conflict approval channel. Every touchpoint already exists.
Audit Integration	Every PromptGuard moral pause or block should be written to the TrustLayer S3 audit ledger with a new event_type: moral.conflict. Compliance teams then have a unified chain of custody.
Risk Score Feed	PromptGuard moral conflict frequency feeds directly into S5 Insurance actuarial scoring. Repeated moral violations elevate risk scores and can trigger agent suspension - a completely new signal type.
SOUL.md as Schema	The Corporate SOUL can be stored in Supabase as a tenant-scoped, Ed25519-signed JSON document, versioned and immutable. This fits naturally into TrustLayer's existing cryptographic architecture.
S8 Architecture - What Needs to Be Built
Scenario	Security	Moral Check	Outcome
New Supabase table: moral_profiles	Corporate SOUL	Per-tenant, Ed25519-signed JSON moral profile. Versioned. Immutable rows.	
New Supabase table: moral_events	Audit trail	Every moral conflict, pause, approval, and override. Feeds S5 risk scoring.	
lib/modules/s8-moralos/soul.ts	Core service	SOUL.md CRUD, signing, validation. Reads Corporate SOUL on every agent session.	
lib/modules/s8-moralos/conscience.ts	Moral engine	Evaluates any action against the SOUL profile. Returns: clear / pause / block.	
lib/modules/s8-moralos/oob.ts	OOB approval	Moral-conflict second approval channel. Separate from standard S7 HITL tickets.	
app/api/v1/moral/route.ts	API routes	POST /evaluate, POST /soul, GET /soul, POST /approve-moral, GET /moral-events	
app/moral/page.tsx	Dashboard panel	Corporate SOUL editor, moral event log, conflict heat map, approval queue.	
Part 4: New Database Schema
Table: moral_profiles

CREATE TABLE moral_profiles (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

version INTEGER NOT NULL DEFAULT 1,

soul_json JSONB NOT NULL,

signature TEXT NOT NULL, -- Ed25519 over soul_json

signed_by TEXT NOT NULL, -- admin user id

is_active BOOLEAN NOT NULL DEFAULT true,

created_at TIMESTAMPTZ DEFAULT NOW()

);

-- Only one active SOUL per tenant

CREATE UNIQUE INDEX ON moral_profiles (tenant_id) WHERE is_active = true;

Table: moral_events

CREATE TABLE moral_events (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

tenant_id UUID NOT NULL,

agent_id UUID NOT NULL,

action_type TEXT NOT NULL,

domain TEXT NOT NULL, -- finance | compliance | ip | comms | security

verdict TEXT NOT NULL, -- clear | pause | block

conflict_reason TEXT,

soul_version INTEGER NOT NULL,

resolved_by TEXT,

resolved_at TIMESTAMPTZ,

created_at TIMESTAMPTZ DEFAULT NOW()

);

ALTER TABLE moral_events ENABLE ROW LEVEL SECURITY;

Part 5: Master Build Prompt
Use this prompt with Claude Code (claude-opus-4-6) or in a new Claude conversation. It is self-contained and includes full context from both TrustLayer and PromptGuard.

─── MASTER BUILD PROMPT - START COPY BELOW THIS LINE ───

# TRUSTLAYER × PROMPTGUARD - MODULE S8 (MORALOS) BUILD

## CONTEXT: EXISTING PLATFORM

You are extending TrustLayer, an enterprise AI governance platform built in Next.js 16

(App Router), Supabase (PostgreSQL 15 + pgvector + RLS), Ed25519 cryptography via Web

Crypto API, RS256 JWTs via @panva/jose, and deployed to Vercel. The platform has 5 modules:

- S3 (Provenance): Ed25519-signed audit ledger of all LLM I/O. ATPClient SDK.

- S6 (Identity): Agent credential registry, RS256 JWTs, PermissionScope enforcement, MCP proxy.

- S1 (Conflict): pgvector semantic intent arbiter. BLOCK/QUEUE/ALERT policy engine.

- S7 (HITL): Exception ticket routing with SLA tiers + Slack webhooks.

- S5 (Insurance): Actuarial risk scoring (0-100) from agent telemetry. Dynamic premiums.

Key files:

lib/ledger/service.ts -> AuditLedgerService.appendEvent()

lib/ledger/signer.ts -> LedgerSigner (Ed25519 sign/verify)

lib/modules/s6-identity/ -> IdentityService, AgentCredential, PermissionScope

lib/modules/s7-hitl/ -> HitlService.createException(), ExceptionTicket

lib/modules/s5-insurance/ -> RiskEngine (reads audit_events for scoring)

lib/sdk/atp-sdk.ts -> ATPClient (OpenAI + Anthropic wrapper)

lib/db/supabase.ts -> createAdminClient(), createBrowserClient()

lib/auth/jwt.ts -> JwtHandler.generateAgentToken()

middleware.ts -> X-Agent-Id enforcement + rate limiting

## YOUR TASK: BUILD MODULE S8 - MoralOS (PromptGuard)

Build a new governance module S8 called MoralOS. It gives every registered AI agent

a Corporate SOUL -- a cryptographically signed moral profile that enforces the company's

values, financial limits, compliance rules, and authority hierarchy. The agent will pause

or block actions that conflict with this profile, even if full permissions are granted.

This is the Manager-RoboDeveloper model: the Manager is the human Father node; the

agent is the Son. The Corporate SOUL is set at org level and cannot be overridden by

any manager or agent -- only by a board-authorized admin.

### STEP 1 - DATABASE MIGRATIONS

Create supabase/migrations/004_moral_os.sql with:

a) moral_profiles table:

- id UUID PK, tenant_id UUID FK -> tenants, version INTEGER default 1

- soul_json JSONB NOT NULL (the moral profile content)

- signature TEXT NOT NULL (Ed25519 over JSON.stringify(soul_json))

- signed_by TEXT NOT NULL (admin user id)

- is_active BOOLEAN default true, created_at TIMESTAMPTZ default NOW()

- UNIQUE INDEX on (tenant_id) WHERE is_active = true

- RLS: tenants can only read their own moral_profiles

b) moral_events table:

- id UUID PK, tenant_id UUID, agent_id UUID, action_description TEXT

- domain TEXT (finance | compliance | ip | comms | security | ops)

- verdict TEXT (clear | pause | block)

- conflict_reason TEXT, soul_version INTEGER

- oob_ticket_id UUID nullable (links to S7 hitl_exceptions if escalated)

- resolved_by TEXT, resolved_at TIMESTAMPTZ

- created_at TIMESTAMPTZ default NOW()

- RLS: same tenant isolation as audit_events

- IMMUTABLE: add a PostgreSQL rule preventing UPDATE/DELETE

### STEP 2 - TYPESCRIPT TYPES

Create lib/modules/s8-moralos/types.ts:

export interface CorporateSoul {

financial: {

transaction_limit_usd: number;

anomaly_multiplier_threshold: number; // e.g. 5 = flag if 5x normal

require_cfo_above_usd: number;

blocked_vendor_categories: string[];

};

compliance: {

frameworks: string[]; // ["GDPR", "HIPAA", "SOC2"]

data_residency_regions: string[];

retention_rules: Record<string, number>; // data_type -> days

require_dpo_for_deletion: boolean;

};

sensitive_data: {

classification_levels: string[]; // ["public","internal","confidential","secret"]

blocked_external_domains: string[];

ip_protection_paths: string[];

pii_handling: "strict" | "standard";

};

security: {

no_self_privilege_escalation: boolean;

require_approval_for_prod_deploy: boolean;

blocked_network_egress: string[];

max_credential_scope: string;

};

authority: {

role_permissions: Record<string, string[]>;

delegation_depth: number; // how many layers deep managers can delegate

require_manager_oob_for: string[]; // action categories

require_ciso_for: string[];

};

}

export interface MoralVerdict {

verdict: "clear" | "pause" | "block";

domain: string;

conflict_reason?: string;

escalate_to?: "manager" | "cfo" | "ciso" | "dpo";

soul_version: number;

}

export interface EvaluateMoralRequest {

agent_id: string;

action_description: string;

domain: string;

action_metadata: Record<string, any>; // amounts, paths, recipients, etc.

}

### STEP 3 - SOUL SERVICE

Create lib/modules/s8-moralos/soul.ts - SoulService:

- static async upsertSoul(tenantId, soul: CorporateSoul, adminId): Promise<void>

1. Deactivate existing active soul for tenant (set is_active = false)

2. Serialize soul_json = JSON.stringify(soul)

3. Sign with LedgerSigner.sign(soul_json) -> signature

4. Insert new moral_profiles row with is_active = true

5. Emit audit event: event_type = "moral.soul_updated", module = "s8"

- static async getActiveSoul(tenantId): Promise<{soul: CorporateSoul, version: number}>

1. Query moral_profiles WHERE tenant_id = tenantId AND is_active = true

2. Verify signature with LedgerSigner.verify()

3. Throw if tampered

4. Return parsed soul_json and version

- static async getSoulHistory(tenantId): Promise<moral_profiles[]>

Return all versions ordered by version DESC

### STEP 4 - CONSCIENCE ENGINE

Create lib/modules/s8-moralos/conscience.ts - ConscienceEngine:

- static async evaluate(tenantId, req: EvaluateMoralRequest): Promise<MoralVerdict>

1. Load active soul via SoulService.getActiveSoul(tenantId)

2. Run domain-specific checks:

FINANCE domain:

- If action_metadata.amount_usd > soul.financial.transaction_limit_usd -> BLOCK

- If action_metadata.amount_usd > soul.financial.require_cfo_above_usd -> PAUSE, escalate_to: "cfo"

- If amount is N * agent historical average where N > anomaly_multiplier -> PAUSE

- If action_metadata.vendor in blocked_vendor_categories -> BLOCK

COMPLIANCE domain:

- If action involves data deletion + require_dpo_for_deletion=true -> PAUSE, escalate_to: "dpo"

- If action_metadata.target_region not in data_residency_regions -> BLOCK

SECURITY domain:

- If action_metadata.is_privilege_escalation + no_self_privilege_escalation -> BLOCK

- If action_metadata.target_env = "production" + require_approval_for_prod_deploy -> PAUSE

- If action_metadata.egress_domain in blocked_network_egress -> BLOCK

COMMS domain:

- If action_metadata.is_bulk_delete + action_metadata.resource = "email" -> PAUSE

- If action_metadata.recipient_count > soul.authority threshold -> PAUSE

3. If verdict != "clear":

a. Write to moral_events table

b. Emit audit event: event_type="moral.conflict", module="s8"

c. If verdict = "pause": create S7 HITL exception ticket with priority based on domain

- finance/security -> "critical"; compliance -> "high"; others -> "medium"

- Set context_data = { moral_verdict: verdict, conflict_reason, escalate_to }

- Store resulting ticket id in moral_events.oob_ticket_id

4. Return MoralVerdict

NOTE: This engine runs AFTER S6 permission check and BEFORE the action executes.

Integrate it into lib/modules/s6-identity/mcp-proxy.ts enforceToolCall() method.

Add after permission validation: const moral = await ConscienceEngine.evaluate(...)

If moral.verdict != "clear" -> return 403 with moral conflict details.

### STEP 5 - API ROUTES

Create app/api/v1/moral/route.ts with these endpoints:

POST /api/v1/moral/evaluate

Body: EvaluateMoralRequest

Auth: X-Agent-Id header (validated via S6 IdentityService)

Returns: MoralVerdict

POST /api/v1/moral/soul

Body: { soul: CorporateSoul }

Auth: Tenant admin JWT only (validate role claim in JWT)

Action: SoulService.upsertSoul()

Returns: { version: number, signature: string }

GET /api/v1/moral/soul

Auth: Tenant JWT

Returns: active CorporateSoul + version + created_at

GET /api/v1/moral/events

Auth: Tenant JWT

Query params: ?domain=finance&verdict=pause&limit=50&offset=0

Returns: paginated moral_events[]

POST /api/v1/moral/soul/[version]/verify

Verifies Ed25519 signature of a given soul version

Returns: { valid: boolean, tampered: boolean }

### STEP 6 - S5 INSURANCE INTEGRATION

Extend lib/modules/s5-insurance/risk-engine.ts:

In the risk score aggregation query, add a new signal:

moral_conflict_rate: COUNT of moral_events WHERE verdict IN ("pause","block")

for this agent in the last 30 days

Add to risk score formula:

moral_risk_contribution = MIN(moral_conflict_rate * 2, 25) // up to 25 points

Add new risk factor label: "Moral Conflict Rate" in the risk profile output.

A "block" verdict counts as 3x a "pause" verdict in the moral_conflict_rate.

### STEP 7 - DASHBOARD UI

Create app/moral/page.tsx - S8 MoralOS Dashboard Panel.

Follow the existing TrustLayer design system exactly:

- Dark charcoal background (#1a1a2e)

- Emerald (#10b981) primary, Amber (#f59e0b) accent

- Glassmorphism cards (backdrop-filter: blur(12px))

- Inter font, animated stat counters, smooth transitions

Include these sections:

1. SOUL STATUS CARD (top)

- Active soul version, last updated, signed by, signature validity badge

- "Configure Corporate SOUL" button -> opens SOULEditorModal

2. MORAL EVENT FEED (main panel)

- Table: action, domain, verdict (color-coded: green/amber/red), conflict reason,

agent, timestamp, OOB ticket link

- Filter by domain and verdict

- Animated new-event pulse on real-time updates (Supabase Realtime)

3. DOMAIN HEAT MAP (sidebar)

- 5 domain tiles (Finance, Compliance, IP, Comms, Security)

- Each shows: pause count, block count, last 30 days

- Color-coded by severity

4. SOULEditorModal

- Multi-tab form for each CorporateSoul section (Financial, Compliance,

Sensitive Data, Security, Authority)

- Ed25519 signature preview before save

- Confirmation step: "This will update the Corporate SOUL for all agents."

Add "MoralOS" entry to components/Sidebar.tsx navigation with a brain/shield icon.

### STEP 8 - OOB APPROVAL CHANNEL

Create lib/modules/s8-moralos/oob.ts - MoralOOBService:

- static async requestMoralApproval(ticket: ExceptionTicket, verdict: MoralVerdict)

1. Extend the S7 WebhookEmitter.notifySlack() call with additional fields:

- [MORAL CONFLICT] prefix in the Slack message title

- Include: domain, conflict_reason, escalate_to, soul_version

- Include approve/reject action buttons if Slack interactive webhooks configured

2. The approval response comes back through the existing S7 /api/v1/exceptions/[id]

PATCH endpoint (action: "approve" | "reject")

3. On approval: write moral_events.resolved_by and resolved_at

Emit audit event: event_type = "moral.approved"

4. On rejection: keep the action blocked

Emit audit event: event_type = "moral.rejected"

NOTE: Re-use S7 HitlService entirely for ticket management.

The OOB service is a thin adapter that adds moral context to S7 tickets.

### STEP 9 - ROBODEVELOPER AGENT ROLES

Extend lib/modules/s6-identity/types.ts:

Add new agent_type values to the union:

| 'robo-finance' | 'robo-compliance' | 'robo-engineering'

| 'robo-security' | 'robo-training' | 'robo-ops'

Each robo-* type has a default domain mapping for ConscienceEngine:

robo-finance -> domain 'finance', default soul checks: transaction limits + anomaly

robo-compliance -> domain 'compliance', default soul checks: GDPR + retention + DPO

robo-engineering-> domain 'security', default soul checks: prod deploy + privilege

robo-security -> domain 'security', default soul checks: self-escalation + egress

robo-training -> domain 'ops', default soul checks: certification + PII

robo-ops -> domain 'comms', default soul checks: bulk email + impersonation

When registering a robo-* agent via S6 IdentityService.registerAgent():

Automatically attach the corresponding domain to agent metadata.

The ConscienceEngine will use this domain as default if none specified in the request.

### CODING RULES (follow existing TrustLayer patterns)

- Use @lib/* path aliases (already configured in tsconfig)

- All new services are static class methods (match S3/S6/S7 pattern)

- All DB writes go through createAdminClient() from lib/db/supabase.ts

- All sensitive events go through AuditLedgerService.appendEvent()

- All Ed25519 operations go through LedgerSigner (lib/ledger/signer.ts)

- TypeScript strict mode. No any types in public interfaces.

- API routes must validate X-Agent-Id header for agent calls

- API routes must validate tenant JWT for dashboard calls

- Moral events table must be IMMUTABLE (PostgreSQL rule, same as audit_events)

- Read AGENTS.md before writing any Next.js code - this is Next.js 16, not 14.

- All new Supabase tables must have RLS enabled with tenant isolation.

### DELIVERABLES CHECKLIST

[ ] supabase/migrations/004_moral_os.sql

[ ] lib/modules/s8-moralos/types.ts

[ ] lib/modules/s8-moralos/soul.ts

[ ] lib/modules/s8-moralos/conscience.ts

[ ] lib/modules/s8-moralos/oob.ts

[ ] app/api/v1/moral/route.ts

[ ] app/moral/page.tsx (full dashboard panel)

[ ] components/moral/SOULEditorModal.tsx

[ ] components/moral/MoralEventFeed.tsx

[ ] components/moral/DomainHeatMap.tsx

[ ] lib/modules/s6-identity/mcp-proxy.ts (modified: add conscience check)

[ ] lib/modules/s6-identity/types.ts (modified: add robo-* agent types)

[ ] lib/modules/s5-insurance/risk-engine.ts (modified: add moral_conflict_rate)

[ ] components/Sidebar.tsx (modified: add MoralOS nav item)

--- END OF PROMPT ---

─── END COPY ───

Part 6: Why This Integration Is the Best Solution
Option A - Native Module S8 (Recommended)
Integrate PromptGuard directly into TrustLayer as Module S8 - MoralOS.

Pros	Reuses all existing infrastructure. Single audit ledger. S5 risk scoring gets moral signal. S7 HITL handles OOB approvals. S6 identity extended with robo-* roles. Single dashboard. Single deployment.
Cons	Deeper coupling. Changes to S6/S7/S5 required. Single codebase to maintain.
Best for	Your case: you own both products, the architecture is complementary, and shared infrastructure gives you a stronger enterprise offering.
Option B - Standalone PromptGuard SDK
Build PromptGuard as a separate package that TrustLayer integrates via npm.

Pros	Independent release cycle. Can be adopted by any AI agent framework, not just TrustLayer.
Cons	Duplicates audit ledger, identity, HITL, and approval infrastructure. Much more work. Weaker integrated story for enterprise buyers.
Best for	If you want to sell PromptGuard to companies that don't use TrustLayer.
Verdict
Start with Option A (native S8 module). The integration is deep and natural - every PromptGuard feature maps to existing TrustLayer infrastructure. Once S8 is stable, you can extract the conscience engine into a standalone package (Option B) as a secondary SKU. This gives you both: a strong integrated enterprise product and a distributable SDK.

PromptGuard Enterprise × TrustLayer - April 2026