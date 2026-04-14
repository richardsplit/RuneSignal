/**
 * RuneSignal HIPAA Compliance Policy Pack
 *
 * Enforces HIPAA-compliant agent behaviour: PHI access controls,
 * minimum necessary rule, and audit requirements.
 *
 * Tier: Pro+
 */

import type { PolicyPack, PolicyRule, PolicyEvalContext, PolicyViolation } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PHI_KEYWORDS = [
  'phi', 'patient', 'medical_record', 'diagnosis', 'prescription',
  'dob', 'date_of_birth', 'ssn', 'social_security', 'health',
  'ehr', 'emr', 'clinical', 'treatment', 'insurance_id',
];

function touchesPhi(ctx: PolicyEvalContext): boolean {
  const haystack = [
    ctx.action,
    ctx.resource ?? '',
    ctx.tool_name ?? '',
    ctx.description ?? '',
  ].join(' ').toLowerCase();
  return PHI_KEYWORDS.some(kw => haystack.includes(kw));
}

// ─── Rules ───────────────────────────────────────────────────────────────────

const noBulkPhiExport: PolicyRule = {
  id: 'hipaa-no-bulk-phi-export',
  name: 'No bulk PHI export',
  description: 'Agent must not export more than 100 PHI records in a single action.',
  domain: 'compliance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPhi(ctx)) return null;

    const isExport =
      /export|download|dump|extract|bulk/i.test(ctx.action) ||
      /export|download|dump|extract|bulk/i.test(ctx.tool_name ?? '');
    if (!isExport) return null;

    const count = typeof ctx.record_count === 'number' ? ctx.record_count : 0;
    if (count > 100) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `Bulk PHI export of ${count} records exceeds the 100-record limit. HIPAA minimum-necessary rule applies.`,
        severity: 'block',
      };
    }
    return null;
  },
};

const phiAccessRequiresJustification: PolicyRule = {
  id: 'hipaa-phi-justification',
  name: 'PHI access requires justification',
  description: 'Access to PHI fields requires a documented clinical justification in the action metadata.',
  domain: 'compliance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPhi(ctx)) return null;

    const isRead =
      /read|fetch|get|query|select|access/i.test(ctx.action) ||
      /read|fetch|get|query|select|access/i.test(ctx.tool_name ?? '');
    if (!isRead) return null;

    const hasJustification =
      typeof ctx.justification === 'string' && ctx.justification.trim().length > 0;
    if (!hasJustification) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: 'PHI access detected but no clinical justification provided in action metadata (field: justification).',
        severity: 'escalate',
      };
    }
    return null;
  },
};

const noPhiToExternalSystems: PolicyRule = {
  id: 'hipaa-no-phi-external',
  name: 'No PHI to external systems',
  description: 'PHI must not be sent to external endpoints without DPO approval.',
  domain: 'security',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPhi(ctx)) return null;

    const isSendToExternal =
      (/send|post|push|forward|webhook|notify/i.test(ctx.action) ||
       /send|post|push|forward|webhook|notify/i.test(ctx.tool_name ?? '')) &&
      typeof ctx.endpoint === 'string' &&
      !ctx.endpoint.includes(process.env.NEXT_PUBLIC_APP_URL ?? 'localhost');

    if (!isSendToExternal) return null;

    const hasDpoApproval =
      typeof ctx.dpo_approval_id === 'string' && ctx.dpo_approval_id.length > 0;

    if (!hasDpoApproval) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `PHI transmission to external endpoint (${ctx.endpoint}) requires DPO approval (metadata field: dpo_approval_id).`,
        severity: 'block',
      };
    }
    return null;
  },
};

const auditAllPhiAccess: PolicyRule = {
  id: 'hipaa-audit-phi',
  name: 'Audit all PHI access',
  description: 'Every PHI access event must include an audit_required flag to ensure ledger logging.',
  domain: 'security',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPhi(ctx)) return null;

    if (ctx.audit_required === false) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: 'PHI access with audit_required=false is forbidden. All PHI events must be logged to the tamper-evident audit ledger.',
        severity: 'block',
      };
    }
    return null;
  },
};

// ─── Pack export ─────────────────────────────────────────────────────────────

export const HipaaCompliancePack: PolicyPack = {
  id: 'hipaa',
  name: 'HIPAA Compliance Pack',
  description: 'Enforces HIPAA-compliant agent behaviour: PHI access controls, minimum necessary rule, audit requirements.',
  category: 'healthcare',
  version: '1.0',
  tier_required: 'pro',
  rules: [
    noBulkPhiExport,
    phiAccessRequiresJustification,
    noPhiToExternalSystems,
    auditAllPhiAccess,
  ],
};
