# S8 MoralOS (PromptGuard) — COMPLETE BUILD PROMPT

> **For: Gemini 3 Flash execution**
> **Project: TrustLayer** at `C:\Users\Richard.Georgiev\OneDrive - DIGITALL Nature\Documents\TrustLayer`
> **Branch: dev**

## CRITICAL RULES

1. **Path aliases**: Files in `lib/` use relative imports (`../../db/supabase`). Files in `src/` use `@/` alias (`@/components/...`) and `@lib/` alias (`@lib/modules/...`).
2. **All services are static class methods** — no `new` constructors, no instance methods.
3. **All DB writes use `createAdminClient()`** from `lib/db/supabase.ts`.
4. **All audit events use `AuditLedgerService.appendEvent()`** from `lib/ledger/service.ts`.
5. **All Ed25519 operations use `getLedgerSigner()`** from `lib/ledger/signer.ts`.
6. **All UI components start with `'use client';`** and use inline `style={{}}` objects + CSS classes from `globals.css`: `glass-panel`, `gradient-text`, `btn`, `btn-primary`, `btn-outline`, `form-group`, `form-label`, `form-input`, `modal-overlay`, `modal-content`, `animate-fade-in`.
7. **Design tokens**: Background `#1a1a2e`, Emerald `#10b981` (primary), Amber `#f59e0b` (accent), Rose `#ef4444` (error), Cyan `#06b6d4` (info). Use CSS vars: `var(--color-primary-emerald)`, `var(--color-accent-amber)`, `var(--color-error-rose)`, `var(--color-info-cyan)`, `var(--color-text-main)`, `var(--color-text-muted)`, `var(--color-bg-surface)`, `var(--border-glass)`.
8. **Existing Modal component** at `src/components/ui/Modal.tsx` — use `<Modal isOpen={} onClose={} title="">`. It renders `modal-overlay` > `modal-content` > `modal-header` + `modal-body`.
9. **Toast system**: `import { useToast } from '@/components/ToastProvider';` then `const { showToast } = useToast();` then `showToast('msg', 'success'|'error'|'info')`.
10. **Tenant ID in dashboard**: `localStorage.getItem('tl_tenant_id') || '7da27c93-6889-4fda-8b22-df4689fbbcd6'`.

Execute ALL steps below in order. Create every file exactly as specified.

---

## STEP 1: DATABASE MIGRATION

**Create file: `supabase/migrations/009_moral_os.sql`**

```sql
-- supabase/migrations/009_moral_os.sql
-- Module S8: MoralOS (PromptGuard Enterprise)

-- Corporate SOUL profiles (versioned, signed, tenant-scoped)
CREATE TABLE moral_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    soul_json JSONB NOT NULL,
    signature TEXT NOT NULL,
    signed_by TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active SOUL per tenant
CREATE UNIQUE INDEX idx_moral_profiles_active ON moral_profiles (tenant_id) WHERE is_active = true;
CREATE INDEX idx_moral_profiles_tenant ON moral_profiles (tenant_id, version DESC);

-- Moral event audit trail
CREATE TABLE moral_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL,
    action_description TEXT NOT NULL,
    domain TEXT NOT NULL,
    verdict TEXT NOT NULL,
    conflict_reason TEXT,
    soul_version INTEGER NOT NULL,
    oob_ticket_id UUID,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutability rules (same pattern as audit_events)
CREATE RULE no_update_moral_events AS ON UPDATE TO moral_events DO INSTEAD NOTHING;
CREATE RULE no_delete_moral_events AS ON DELETE TO moral_events DO INSTEAD NOTHING;

CREATE INDEX idx_moral_events_tenant ON moral_events (tenant_id, created_at DESC);
CREATE INDEX idx_moral_events_agent ON moral_events (agent_id);
CREATE INDEX idx_moral_events_verdict ON moral_events (verdict);
CREATE INDEX idx_moral_events_domain ON moral_events (domain);

-- Row Level Security
ALTER TABLE moral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE moral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY moral_profiles_tenant_isolation ON moral_profiles
    FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY moral_events_tenant_isolation ON moral_events
    FOR SELECT USING (tenant_id = auth.uid());
```

---

## STEP 2: TYPESCRIPT TYPES

**Create file: `lib/modules/s8-moralos/types.ts`**

```typescript
export interface CorporateSoul {
  financial: {
    transaction_limit_usd: number;
    anomaly_multiplier_threshold: number;
    require_cfo_above_usd: number;
    blocked_vendor_categories: string[];
  };
  compliance: {
    frameworks: string[];
    data_residency_regions: string[];
    retention_rules: Record<string, number>;
    require_dpo_for_deletion: boolean;
  };
  sensitive_data: {
    classification_levels: string[];
    blocked_external_domains: string[];
    ip_protection_paths: string[];
    pii_handling: 'strict' | 'standard';
  };
  security: {
    no_self_privilege_escalation: boolean;
    require_approval_for_prod_deploy: boolean;
    blocked_network_egress: string[];
    max_credential_scope: string;
  };
  authority: {
    role_permissions: Record<string, string[]>;
    delegation_depth: number;
    require_manager_oob_for: string[];
    require_ciso_for: string[];
  };
}

export interface MoralVerdict {
  verdict: 'clear' | 'pause' | 'block';
  domain: string;
  conflict_reason?: string;
  escalate_to?: 'manager' | 'cfo' | 'ciso' | 'dpo';
  soul_version: number;
}

export interface EvaluateMoralRequest {
  agent_id: string;
  action_description: string;
  domain: string;
  action_metadata: Record<string, unknown>;
}

export interface MoralProfile {
  id: string;
  tenant_id: string;
  version: number;
  soul_json: CorporateSoul;
  signature: string;
  signed_by: string;
  is_active: boolean;
  created_at: string;
}

export interface MoralEvent {
  id: string;
  tenant_id: string;
  agent_id: string;
  action_description: string;
  domain: string;
  verdict: 'clear' | 'pause' | 'block';
  conflict_reason?: string;
  soul_version: number;
  oob_ticket_id?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// Maps robo-* agent types to their default moral domain
export const ROBO_DOMAIN_MAP: Record<string, string> = {
  'robo-finance': 'finance',
  'robo-compliance': 'compliance',
  'robo-engineering': 'security',
  'robo-security': 'security',
  'robo-training': 'ops',
  'robo-ops': 'comms',
};
```

---

## STEP 3: SOUL SERVICE

**Create file: `lib/modules/s8-moralos/soul.ts`**

```typescript
import { createAdminClient } from '../../db/supabase';
import { getLedgerSigner } from '../../ledger/signer';
import { AuditLedgerService } from '../../ledger/service';
import { CorporateSoul, MoralProfile } from './types';
import { v4 as uuidv4 } from 'uuid';

export class SoulService {
  /**
   * Creates or updates the Corporate SOUL for a tenant.
   * Deactivates previous version, signs new one with Ed25519.
   */
  static async upsertSoul(tenantId: string, soul: CorporateSoul, adminId: string): Promise<{ version: number; signature: string }> {
    const supabase = createAdminClient();
    const signer = getLedgerSigner();

    // Get current max version
    const { data: existing } = await supabase
      .from('moral_profiles')
      .select('version')
      .eq('tenant_id', tenantId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = existing ? existing.version + 1 : 1;

    // Deactivate current active soul
    await supabase
      .from('moral_profiles')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    // Sign the soul JSON
    const soulString = JSON.stringify(soul);
    const signature = signer.sign(Buffer.from(soulString, 'utf-8'));

    // Insert new active soul
    const { error } = await supabase
      .from('moral_profiles')
      .insert({
        tenant_id: tenantId,
        version: newVersion,
        soul_json: soul,
        signature,
        signed_by: adminId,
        is_active: true
      });

    if (error) throw new Error(`Failed to upsert SOUL: ${error.message}`);

    // Audit event
    await AuditLedgerService.appendEvent({
      event_type: 'moral.soul_updated',
      module: 's8',
      tenant_id: tenantId,
      agent_id: null,
      request_id: uuidv4(),
      payload: { version: newVersion, signed_by: adminId }
    });

    return { version: newVersion, signature };
  }

  /**
   * Retrieves the active Corporate SOUL for a tenant.
   * Verifies Ed25519 signature integrity.
   */
  static async getActiveSoul(tenantId: string): Promise<{ soul: CorporateSoul; version: number; profile: MoralProfile }> {
    const supabase = createAdminClient();
    const signer = getLedgerSigner();

    const { data, error } = await supabase
      .from('moral_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new Error('No active Corporate SOUL found for this tenant');

    // Verify signature
    const soulString = JSON.stringify(data.soul_json);
    const isValid = signer.verify(Buffer.from(soulString, 'utf-8'), data.signature);
    if (!isValid) throw new Error('SOUL signature verification failed — possible tampering detected');

    return { soul: data.soul_json as CorporateSoul, version: data.version, profile: data as MoralProfile };
  }

  /**
   * Returns all SOUL versions for a tenant, newest first.
   */
  static async getSoulHistory(tenantId: string): Promise<MoralProfile[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('moral_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('version', { ascending: false });

    if (error) throw new Error(`Failed to fetch SOUL history: ${error.message}`);
    return data as MoralProfile[];
  }

  /**
   * Verifies the Ed25519 signature of a specific SOUL version.
   */
  static async verifySoulVersion(tenantId: string, version: number): Promise<{ valid: boolean; tampered: boolean }> {
    const supabase = createAdminClient();
    const signer = getLedgerSigner();

    const { data, error } = await supabase
      .from('moral_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('version', version)
      .single();

    if (error || !data) throw new Error(`SOUL version ${version} not found`);

    const soulString = JSON.stringify(data.soul_json);
    const valid = signer.verify(Buffer.from(soulString, 'utf-8'), data.signature);

    return { valid, tampered: !valid };
  }
}
```

---

## STEP 4: CONSCIENCE ENGINE

**Create file: `lib/modules/s8-moralos/conscience.ts`**

```typescript
import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { HitlService } from '../s7-hitl/service';
import { SoulService } from './soul';
import { EvaluateMoralRequest, MoralVerdict, CorporateSoul, ROBO_DOMAIN_MAP } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ConscienceEngine {
  /**
   * Evaluates an agent action against the Corporate SOUL.
   * Runs AFTER S6 permission check, BEFORE action execution.
   */
  static async evaluate(tenantId: string, request: EvaluateMoralRequest): Promise<MoralVerdict> {
    let soulData;
    try {
      soulData = await SoulService.getActiveSoul(tenantId);
    } catch {
      // No SOUL configured — everything is clear
      return { verdict: 'clear', domain: request.domain, soul_version: 0 };
    }

    const { soul, version } = soulData;
    const meta = request.action_metadata;
    const domain = request.domain;

    let verdict: MoralVerdict = { verdict: 'clear', domain, soul_version: version };

    // Domain-specific checks
    switch (domain) {
      case 'finance':
        verdict = this.checkFinance(soul, meta, version);
        break;
      case 'compliance':
        verdict = this.checkCompliance(soul, meta, version);
        break;
      case 'security':
        verdict = this.checkSecurity(soul, meta, version);
        break;
      case 'comms':
        verdict = this.checkComms(soul, meta, version);
        break;
      case 'ip':
        verdict = this.checkIP(soul, meta, version);
        break;
      default:
        verdict = { verdict: 'clear', domain, soul_version: version };
    }

    // Record non-clear verdicts
    if (verdict.verdict !== 'clear') {
      const supabase = createAdminClient();
      let oobTicketId: string | undefined;

      // For pause verdicts, create S7 HITL ticket
      if (verdict.verdict === 'pause') {
        const priorityMap: Record<string, 'critical' | 'high' | 'medium'> = {
          finance: 'critical', security: 'critical', compliance: 'high',
          comms: 'medium', ip: 'medium', ops: 'medium'
        };
        try {
          const ticket = await HitlService.createException(tenantId, request.agent_id, {
            title: `[MORAL CONFLICT] ${verdict.conflict_reason || 'Action paused by Corporate SOUL'}`,
            description: `Domain: ${domain}\nAction: ${request.action_description}\nEscalate to: ${verdict.escalate_to || 'manager'}`,
            priority: priorityMap[domain] || 'medium',
            context_data: { moral_verdict: verdict.verdict, conflict_reason: verdict.conflict_reason, escalate_to: verdict.escalate_to, soul_version: version }
          });
          oobTicketId = ticket.id;
        } catch (e) {
          console.error('Failed to create HITL ticket for moral pause:', e);
        }
      }

      // Write moral event
      await supabase.from('moral_events').insert({
        tenant_id: tenantId,
        agent_id: request.agent_id,
        action_description: request.action_description,
        domain,
        verdict: verdict.verdict,
        conflict_reason: verdict.conflict_reason || null,
        soul_version: version,
        oob_ticket_id: oobTicketId || null
      });

      // Audit ledger
      await AuditLedgerService.appendEvent({
        event_type: 'moral.conflict',
        module: 's8',
        tenant_id: tenantId,
        agent_id: request.agent_id,
        request_id: uuidv4(),
        payload: { domain, verdict: verdict.verdict, conflict_reason: verdict.conflict_reason, escalate_to: verdict.escalate_to }
      });
    }

    return verdict;
  }

  private static checkFinance(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const amount = meta.amount_usd as number | undefined;
    const vendor = meta.vendor as string | undefined;

    if (amount && amount > soul.financial.transaction_limit_usd) {
      return { verdict: 'block', domain: 'finance', conflict_reason: `Transaction $${amount} exceeds hard limit of $${soul.financial.transaction_limit_usd}`, soul_version: version };
    }
    if (amount && amount > soul.financial.require_cfo_above_usd) {
      return { verdict: 'pause', domain: 'finance', conflict_reason: `Transaction $${amount} requires CFO approval (threshold: $${soul.financial.require_cfo_above_usd})`, escalate_to: 'cfo', soul_version: version };
    }
    if (vendor && soul.financial.blocked_vendor_categories.includes(vendor)) {
      return { verdict: 'block', domain: 'finance', conflict_reason: `Vendor category "${vendor}" is blocked by Corporate SOUL`, soul_version: version };
    }
    return { verdict: 'clear', domain: 'finance', soul_version: version };
  }

  private static checkCompliance(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const isDeletion = meta.is_data_deletion as boolean | undefined;
    const targetRegion = meta.target_region as string | undefined;

    if (isDeletion && soul.compliance.require_dpo_for_deletion) {
      return { verdict: 'pause', domain: 'compliance', conflict_reason: 'Data deletion requires DPO approval', escalate_to: 'dpo', soul_version: version };
    }
    if (targetRegion && soul.compliance.data_residency_regions.length > 0 && !soul.compliance.data_residency_regions.includes(targetRegion)) {
      return { verdict: 'block', domain: 'compliance', conflict_reason: `Data residency violation: "${targetRegion}" not in allowed regions [${soul.compliance.data_residency_regions.join(', ')}]`, soul_version: version };
    }
    return { verdict: 'clear', domain: 'compliance', soul_version: version };
  }

  private static checkSecurity(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const isPrivEsc = meta.is_privilege_escalation as boolean | undefined;
    const targetEnv = meta.target_env as string | undefined;
    const egressDomain = meta.egress_domain as string | undefined;

    if (isPrivEsc && soul.security.no_self_privilege_escalation) {
      return { verdict: 'block', domain: 'security', conflict_reason: 'Self-privilege escalation is prohibited by Corporate SOUL', soul_version: version };
    }
    if (targetEnv === 'production' && soul.security.require_approval_for_prod_deploy) {
      return { verdict: 'pause', domain: 'security', conflict_reason: 'Production deployment requires CISO approval', escalate_to: 'ciso', soul_version: version };
    }
    if (egressDomain && soul.security.blocked_network_egress.includes(egressDomain)) {
      return { verdict: 'block', domain: 'security', conflict_reason: `Network egress to "${egressDomain}" is blocked`, soul_version: version };
    }
    return { verdict: 'clear', domain: 'security', soul_version: version };
  }

  private static checkComms(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const isBulkDelete = meta.is_bulk_delete as boolean | undefined;
    const resource = meta.resource as string | undefined;

    if (isBulkDelete && resource === 'email') {
      return { verdict: 'pause', domain: 'comms', conflict_reason: 'Bulk email deletion requires manager approval', escalate_to: 'manager', soul_version: version };
    }
    return { verdict: 'clear', domain: 'comms', soul_version: version };
  }

  private static checkIP(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const targetDomain = meta.external_domain as string | undefined;
    const filePath = meta.file_path as string | undefined;

    if (targetDomain && soul.sensitive_data.blocked_external_domains.includes(targetDomain)) {
      return { verdict: 'block', domain: 'ip', conflict_reason: `External domain "${targetDomain}" is blocked for IP protection`, soul_version: version };
    }
    if (filePath && soul.sensitive_data.ip_protection_paths.some(p => filePath.startsWith(p))) {
      return { verdict: 'pause', domain: 'ip', conflict_reason: `File path "${filePath}" is under IP protection`, escalate_to: 'ciso', soul_version: version };
    }
    return { verdict: 'clear', domain: 'ip', soul_version: version };
  }
}
```

---

## STEP 5: OOB APPROVAL SERVICE

**Create file: `lib/modules/s8-moralos/oob.ts`**

```typescript
import { AuditLedgerService } from '../../ledger/service';
import { WebhookEmitter } from '../../webhooks/emitter';
import { ExceptionTicket } from '../s7-hitl/types';
import { MoralVerdict } from './types';
import { createAdminClient } from '../../db/supabase';
import { v4 as uuidv4 } from 'uuid';

export class MoralOOBService {
  /**
   * Sends enhanced Slack notification for moral conflicts.
   * Thin adapter over existing S7 WebhookEmitter.
   */
  static async requestMoralApproval(ticket: ExceptionTicket, verdict: MoralVerdict): Promise<void> {
    await WebhookEmitter.notifySlack(
      `🧠 [MORAL CONFLICT] ${verdict.conflict_reason || 'Action requires moral review'}`,
      {
        Domain: verdict.domain,
        Verdict: verdict.verdict,
        'Escalate To': verdict.escalate_to || 'manager',
        'SOUL Version': verdict.soul_version,
        'Ticket ID': ticket.id,
        Priority: ticket.priority
      }
    );
  }

  /**
   * Resolves a moral event after S7 ticket approval/rejection.
   * Call this from the S7 exception resolve flow when the ticket has moral context.
   */
  static async resolveMoralEvent(tenantId: string, oobTicketId: string, action: 'approve' | 'reject', reviewerId: string): Promise<void> {
    const supabase = createAdminClient();

    // Find the moral event linked to this ticket
    // Note: moral_events has immutability rules, so we query but cannot update directly.
    // Instead, we insert a resolution record into the audit ledger.
    const { data: moralEvent } = await supabase
      .from('moral_events')
      .select('*')
      .eq('oob_ticket_id', oobTicketId)
      .single();

    if (!moralEvent) return;

    const eventType = action === 'approve' ? 'moral.approved' : 'moral.rejected';

    await AuditLedgerService.appendEvent({
      event_type: eventType,
      module: 's8',
      tenant_id: tenantId,
      agent_id: moralEvent.agent_id,
      request_id: uuidv4(),
      payload: {
        moral_event_id: moralEvent.id,
        domain: moralEvent.domain,
        original_verdict: moralEvent.verdict,
        resolution: action,
        reviewer: reviewerId
      }
    });
  }
}
```

---

## STEP 6: API ROUTES

**Create file: `src/app/api/v1/moral/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ConscienceEngine } from '../../../../../lib/modules/s8-moralos/conscience';
import { SoulService } from '../../../../../lib/modules/s8-moralos/soul';
import { createAdminClient } from '../../../../../lib/db/supabase';

/**
 * POST /api/v1/moral/evaluate
 * Evaluate an agent action against the Corporate SOUL.
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const agentId = request.headers.get('X-Agent-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();

    // If this is a SOUL upsert (check for soul field in body)
    if (body.soul) {
      const adminId = body.admin_id || 'system';
      const result = await SoulService.upsertSoul(tenantId, body.soul, adminId);
      return NextResponse.json(result);
    }

    // Otherwise it's a moral evaluation
    if (!agentId) return NextResponse.json({ error: 'Missing X-Agent-Id for evaluation' }, { status: 400 });
    if (!body.action_description || !body.domain) {
      return NextResponse.json({ error: 'Missing action_description or domain' }, { status: 400 });
    }

    const verdict = await ConscienceEngine.evaluate(tenantId, {
      agent_id: agentId,
      action_description: body.action_description,
      domain: body.domain,
      action_metadata: body.action_metadata || {}
    });

    if (verdict.verdict === 'block') {
      return NextResponse.json(verdict, { status: 403 });
    }

    return NextResponse.json(verdict);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/v1/moral
 * Returns active SOUL or paginated moral events.
 * ?type=soul -> active SOUL
 * ?type=events&domain=finance&verdict=pause&limit=50&offset=0 -> events
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'soul';

  try {
    if (type === 'soul') {
      const result = await SoulService.getActiveSoul(tenantId);
      return NextResponse.json({
        soul: result.soul,
        version: result.version,
        signed_by: result.profile.signed_by,
        signature: result.profile.signature,
        created_at: result.profile.created_at
      });
    }

    if (type === 'events') {
      const supabase = createAdminClient();
      const domain = searchParams.get('domain');
      const verdict = searchParams.get('verdict');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      let query = supabase
        .from('moral_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (domain) query = query.eq('domain', domain);
      if (verdict) query = query.eq('verdict', verdict);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === 'history') {
      const history = await SoulService.getSoulHistory(tenantId);
      return NextResponse.json(history);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

**Create file: `src/app/api/v1/moral/verify/[version]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SoulService } from '../../../../../../../lib/modules/s8-moralos/soul';

/**
 * POST /api/v1/moral/verify/[version]
 * Verifies the Ed25519 signature of a specific SOUL version.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const { version } = await params;
    const versionNum = parseInt(version);
    if (isNaN(versionNum)) return NextResponse.json({ error: 'Invalid version' }, { status: 400 });

    const result = await SoulService.verifySoulVersion(tenantId, versionNum);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

---

## STEP 7: MODIFY EXISTING FILES

### 7A. Add 's8' to AuditLedgerService module type

**File: `lib/ledger/service.ts`**
**Find this line (line 7):**
```
  module: 's3' | 's1' | 's6' | 's7' | 's5';
```
**Replace with:**
```
  module: 's3' | 's1' | 's6' | 's7' | 's5' | 's8';
```

### 7B. Add robo-* agent types to S6 Identity

**File: `lib/modules/s6-identity/types.ts`**
**Find this line (line 5):**
```
  agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom' | 'finance' | 'orchestrator';
```
**Replace with:**
```
  agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom' | 'finance' | 'orchestrator' | 'robo-finance' | 'robo-compliance' | 'robo-engineering' | 'robo-security' | 'robo-training' | 'robo-ops';
```

**Find this line (line 28):**
```
  agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom' | 'finance' | 'orchestrator';
```
**Replace with:**
```
  agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom' | 'finance' | 'orchestrator' | 'robo-finance' | 'robo-compliance' | 'robo-engineering' | 'robo-security' | 'robo-training' | 'robo-ops';
```

### 7C. Add ConscienceEngine check to MCP Proxy

**File: `lib/modules/s6-identity/mcp-proxy.ts`**
**Replace the ENTIRE file content with:**
```typescript
import { IdentityService } from './service';
import { ConscienceEngine } from '../s8-moralos/conscience';
import { ROBO_DOMAIN_MAP } from '../s8-moralos/types';
import { createAdminClient } from '../../db/supabase';

/**
 * MCP Proxy Enforcement logic.
 * This can be used as a standalone library within an MCP server or proxied via an API.
 */
export class McpEnforcementProxy {
  /**
   * Enforces a tool call based on the agent's permission manifest AND Corporate SOUL.
   * 1. S6 Permission check
   * 2. S8 Moral check (ConscienceEngine)
   */
  static async enforceToolCall(agentId: string, toolName: string, tenantId?: string): Promise<{ allowed: boolean; reason: string; moral_verdict?: string }> {
    // Step 1: S6 Permission check
    const permResult = await IdentityService.validatePermission(agentId, `tool:${toolName}`, 'execute');
    if (!permResult.allowed) {
      return permResult;
    }

    // Step 2: S8 Moral check (if tenantId available)
    if (tenantId) {
      try {
        // Look up agent to determine domain
        const supabase = createAdminClient();
        const { data: agent } = await supabase
          .from('agent_credentials')
          .select('agent_type, metadata')
          .eq('id', agentId)
          .single();

        const domain = agent?.metadata?.moral_domain || ROBO_DOMAIN_MAP[agent?.agent_type] || 'ops';

        const moral = await ConscienceEngine.evaluate(tenantId, {
          agent_id: agentId,
          action_description: `Tool call: ${toolName}`,
          domain,
          action_metadata: { tool_name: toolName }
        });

        if (moral.verdict !== 'clear') {
          return {
            allowed: false,
            reason: `Moral conflict: ${moral.conflict_reason || 'Action blocked by Corporate SOUL'}`,
            moral_verdict: moral.verdict
          };
        }
      } catch (e) {
        // If conscience check fails, allow (fail-open for tool calls)
        console.warn('ConscienceEngine check failed, allowing tool call:', e);
      }
    }

    return permResult;
  }
}
```

### 7D. Add moral_conflicts to S5 Insurance types

**File: `lib/modules/s5-insurance/types.ts`**
**Find this line (line 20):**
```
  last_computed_at: string;
```
**Replace with:**
```
  moral_conflicts?: number;
  last_computed_at: string;
```

### 7E. Add moral_conflict_rate to S5 Risk Engine

**File: `lib/modules/s5-insurance/risk-engine.ts`**

**Find these lines (lines 27-31):**
```
    if (profile.hitl_escalations > 0) {
      // HITL escalations represent uncertainty but aren't explicitly malicious
      score += profile.hitl_escalations * 2;
      factors.push(`Human Escalations (+${profile.hitl_escalations * 2})`);
    }

    // Cap at 100
```
**Replace with:**
```
    if (profile.hitl_escalations > 0) {
      // HITL escalations represent uncertainty but aren't explicitly malicious
      score += profile.hitl_escalations * 2;
      factors.push(`Human Escalations (+${profile.hitl_escalations * 2})`);
    }

    // S8 Moral conflict rate contribution (up to 25 points)
    if (profile.moral_conflicts && profile.moral_conflicts > 0) {
      const moralContribution = Math.min(profile.moral_conflicts * 2, 25);
      score += moralContribution;
      factors.push(`Moral Conflict Rate (+${moralContribution})`);
    }

    // Cap at 100
```

**Find these lines (lines 136-149):**
```
    const { count: anomalies } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('event_type', 'model.version_anomaly_detected');

    const profileData = {
      tenant_id: tenantId,
      agent_id: agentId,
      risk_score: 0, // Computed below
      total_violations: violations || 0,
      hitl_escalations: hitl || 0,
      model_version_anomalies: anomalies || 0,
      last_computed_at: new Date().toISOString()
    };
```
**Replace with:**
```
    const { count: anomalies } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('event_type', 'model.version_anomaly_detected');

    // S8: Count moral conflicts (block counts as 3x pause)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: moralPauses } = await supabase
      .from('moral_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('verdict', 'pause')
      .gte('created_at', thirtyDaysAgo);

    const { count: moralBlocks } = await supabase
      .from('moral_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('verdict', 'block')
      .gte('created_at', thirtyDaysAgo);

    const moralConflictRate = (moralPauses || 0) + (moralBlocks || 0) * 3;

    const profileData = {
      tenant_id: tenantId,
      agent_id: agentId,
      risk_score: 0, // Computed below
      total_violations: violations || 0,
      hitl_escalations: hitl || 0,
      model_version_anomalies: anomalies || 0,
      moral_conflicts: moralConflictRate,
      last_computed_at: new Date().toISOString()
    };
```

### 7F. Add moral/evaluate to middleware sensitive routes

**File: `middleware.ts`**
**Find this line (line 74):**
```
        const sensitiveRoutes = ['/api/v1/provenance/certify', '/api/v1/intent', '/api/v1/enforce/tool-call'];
```
**Replace with:**
```
        const sensitiveRoutes = ['/api/v1/provenance/certify', '/api/v1/intent', '/api/v1/enforce/tool-call', '/api/v1/moral/evaluate'];
```

### 7G. Add MoralOS to Sidebar navigation

**File: `src/components/Sidebar.tsx`**
**Find this line (line 17):**
```
    { name: 'S5 Insurance', href: '/insurance' },
```
**Replace with:**
```
    { name: 'S5 Insurance', href: '/insurance' },
    { name: 'S8 MoralOS', href: '/moral' },
```

---

## STEP 8: DASHBOARD UI — SEE PART 2

The dashboard UI files are described in the companion document `S8_MORALOS_BUILD_PROMPT_UI.md`.

---

## VERIFICATION

After completing ALL steps, run:
```bash
npm run build
```
Fix any TypeScript errors. Then run:
```bash
npm run dev
```
Open `http://localhost:3000/moral` in a browser to verify the dashboard renders.
