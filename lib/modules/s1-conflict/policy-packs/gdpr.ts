/**
 * RuneSignal GDPR Data Protection Policy Pack
 *
 * Enforces GDPR-compliant AI agent behaviour: purpose limitation,
 * data minimisation, right to erasure, cross-border transfer controls.
 *
 * Tier: Starter+ (available to all paid tiers)
 */

import type { PolicyPack, PolicyRule, PolicyEvalContext, PolicyViolation } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PERSONAL_DATA_KEYWORDS = [
  'personal_data', 'pii', 'email', 'phone', 'address', 'name',
  'ip_address', 'cookie', 'user_id', 'customer', 'gdpr',
  'data_subject', 'consent', 'profile', 'location', 'device_id',
];

// EU/EEA country codes — transfers outside these require consent or SCC
const EEA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU',
  'LV', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  'UK', // Post-Brexit adequacy decision in effect
]);

function touchesPersonalData(ctx: PolicyEvalContext): boolean {
  const haystack = [
    ctx.action,
    ctx.resource ?? '',
    ctx.tool_name ?? '',
    ctx.description ?? '',
  ].join(' ').toLowerCase();
  return PERSONAL_DATA_KEYWORDS.some(kw => haystack.includes(kw));
}

// ─── Rules ───────────────────────────────────────────────────────────────────

const purposeLimitation: PolicyRule = {
  id: 'gdpr-purpose-limitation',
  name: 'Purpose limitation',
  description: 'Agent must not use personal data for purposes beyond the original collection intent.',
  domain: 'compliance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPersonalData(ctx)) return null;

    const originalPurpose = typeof ctx.data_collection_purpose === 'string'
      ? ctx.data_collection_purpose.toLowerCase()
      : null;
    const currentPurpose = typeof ctx.action_purpose === 'string'
      ? ctx.action_purpose.toLowerCase()
      : null;

    if (originalPurpose && currentPurpose && originalPurpose !== currentPurpose) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `GDPR purpose limitation: personal data collected for "${ctx.data_collection_purpose}" cannot be used for "${ctx.action_purpose}".`,
        severity: 'block',
      };
    }
    return null;
  },
};

const dataMinimisation: PolicyRule = {
  id: 'gdpr-data-minimisation',
  name: 'Data minimisation',
  description: 'Agent must not collect more personal data fields than necessary for the declared task.',
  domain: 'compliance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPersonalData(ctx)) return null;

    const isCollection =
      /collect|gather|ingest|import|scrape|harvest/i.test(ctx.action) ||
      /collect|gather|ingest|import|scrape|harvest/i.test(ctx.tool_name ?? '');
    if (!isCollection) return null;

    const fieldsRequested = Array.isArray(ctx.fields_requested)
      ? (ctx.fields_requested as string[]).length
      : 0;
    const fieldsJustified = Array.isArray(ctx.fields_justified)
      ? (ctx.fields_justified as string[]).length
      : fieldsRequested; // If no justification list, assume all are justified

    if (fieldsRequested > fieldsJustified) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `GDPR data minimisation: ${fieldsRequested} fields requested but only ${fieldsJustified} justified. Remove unjustified fields from metadata.fields_justified.`,
        severity: 'escalate',
      };
    }
    return null;
  },
};

const rightToErasureRequiresDpo: PolicyRule = {
  id: 'gdpr-erasure-dpo',
  name: 'Right to erasure requires DPO approval',
  description: 'Data deletion actions on personal data require DPO approval before execution.',
  domain: 'privacy',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPersonalData(ctx)) return null;

    const isDeletion =
      /delete|erase|purge|remove|wipe|forget/i.test(ctx.action) ||
      /delete|erase|purge|remove|wipe|forget/i.test(ctx.tool_name ?? '');
    if (!isDeletion) return null;

    const hasDpoApproval =
      typeof ctx.dpo_approval_id === 'string' && ctx.dpo_approval_id.length > 0;

    if (!hasDpoApproval) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: 'GDPR right to erasure: personal data deletion requires DPO approval (metadata field: dpo_approval_id).',
        severity: 'block',
      };
    }
    return null;
  },
};

const noCrossBorderTransferWithoutConsent: PolicyRule = {
  id: 'gdpr-cross-border-transfer',
  name: 'No cross-border personal data transfer without consent',
  description: 'Personal data must not be transferred outside EEA-approved regions without documented basis.',
  domain: 'privacy',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesPersonalData(ctx)) return null;

    const destinationCountry = typeof ctx.destination_country === 'string'
      ? ctx.destination_country.toUpperCase()
      : null;

    if (!destinationCountry) return null;
    if (EEA_COUNTRIES.has(destinationCountry)) return null; // EEA transfer — fine

    // Non-EEA: require either consent or SCC reference
    const hasConsent =
      typeof ctx.data_subject_consent_id === 'string' && ctx.data_subject_consent_id.length > 0;
    const hasScc =
      typeof ctx.scc_reference === 'string' && ctx.scc_reference.length > 0;

    if (!hasConsent && !hasScc) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `GDPR cross-border transfer to ${destinationCountry} (non-EEA) requires data subject consent (field: data_subject_consent_id) or Standard Contractual Clauses reference (field: scc_reference).`,
        severity: 'block',
      };
    }
    return null;
  },
};

// ─── Pack export ─────────────────────────────────────────────────────────────

export const GdprDataProtectionPack: PolicyPack = {
  id: 'gdpr',
  name: 'GDPR Data Protection Pack',
  description: 'Enforces GDPR-compliant AI agent behaviour: purpose limitation, data minimisation, right to erasure.',
  category: 'privacy',
  version: '1.0',
  tier_required: 'starter',
  rules: [
    purposeLimitation,
    dataMinimisation,
    rightToErasureRequiresDpo,
    noCrossBorderTransferWithoutConsent,
  ],
};
