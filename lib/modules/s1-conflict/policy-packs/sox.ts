/**
 * RuneSignal SOX Financial Controls Policy Pack
 *
 * Implements SOX Section 302/404 controls for AI agents performing
 * financial operations: segregation of duties, journal limits,
 * no backdating, mandatory provenance.
 *
 * Tier: Pro+
 */

import type { PolicyPack, PolicyRule, PolicyEvalContext, PolicyViolation } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FINANCIAL_KEYWORDS = [
  'journal', 'ledger', 'transaction', 'payment', 'transfer',
  'invoice', 'expense', 'budget', 'financial', 'accounting',
  'debit', 'credit', 'gl_entry', 'general_ledger', 'sox',
];

function isFinancialAction(ctx: PolicyEvalContext): boolean {
  const haystack = [
    ctx.action,
    ctx.resource ?? '',
    ctx.tool_name ?? '',
    ctx.description ?? '',
  ].join(' ').toLowerCase();
  return FINANCIAL_KEYWORDS.some(kw => haystack.includes(kw));
}

// ─── Rules ───────────────────────────────────────────────────────────────────

const segregationOfDuties: PolicyRule = {
  id: 'sox-segregation-of-duties',
  name: 'Segregation of duties',
  description: 'An agent cannot both approve and execute financial transactions in the same session.',
  domain: 'finance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!isFinancialAction(ctx)) return null;

    const isApproveAndExecute =
      ctx.approved_by_self === true ||
      (typeof ctx.approver_id === 'string' &&
       typeof ctx.executor_id === 'string' &&
       ctx.approver_id === ctx.executor_id);

    if (isApproveAndExecute) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: 'SOX segregation of duties violation: the approving agent cannot also execute the financial transaction.',
        severity: 'block',
      };
    }
    return null;
  },
};

const journalEntryLimit: PolicyRule = {
  id: 'sox-journal-entry-limit',
  name: 'Journal entry limit — $50,000 threshold',
  description: 'Journal entries over $50,000 require CFO approval.',
  domain: 'finance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!isFinancialAction(ctx)) return null;

    const isJournalEntry =
      /journal|gl_entry|general_ledger|post/i.test(ctx.action) ||
      /journal|gl_entry|general_ledger|post/i.test(ctx.tool_name ?? '');
    if (!isJournalEntry) return null;

    const amount = typeof ctx.amount === 'number' ? ctx.amount : 0;
    if (amount > 50000) {
      const hasCfoApproval =
        typeof ctx.cfo_approval_id === 'string' && ctx.cfo_approval_id.length > 0;
      if (!hasCfoApproval) {
        return {
          rule_id: this.id,
          rule_name: this.name,
          message: `Journal entry of $${amount.toLocaleString()} exceeds $50,000 SOX threshold. Requires CFO approval (metadata field: cfo_approval_id).`,
          severity: 'block',
        };
      }
    }
    return null;
  },
};

const noRetroactiveEntries: PolicyRule = {
  id: 'sox-no-backdating',
  name: 'No retroactive journal entries',
  description: 'Agent cannot create backdated journal entries.',
  domain: 'finance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!isFinancialAction(ctx)) return null;

    if (typeof ctx.entry_date !== 'string') return null;

    const entryDate = new Date(ctx.entry_date).getTime();
    const now = Date.now();

    // Allow up to 1 day tolerance for timezone/batch processing
    if (entryDate < now - 86_400_000) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `SOX backdating violation: journal entry_date (${ctx.entry_date}) is in the past. Retroactive entries are prohibited.`,
        severity: 'block',
      };
    }
    return null;
  },
};

const auditTrailMandatory: PolicyRule = {
  id: 'sox-audit-trail',
  name: 'Audit trail mandatory for financial actions',
  description: 'All financial actions require an Ed25519-signed provenance certificate.',
  domain: 'finance',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!isFinancialAction(ctx)) return null;

    if (ctx.audit_required === false || ctx.skip_provenance === true) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: 'SOX audit trail violation: financial actions cannot bypass the Ed25519 provenance ledger.',
        severity: 'block',
      };
    }
    return null;
  },
};

// ─── Pack export ─────────────────────────────────────────────────────────────

export const SoxFinancialControlsPack: PolicyPack = {
  id: 'sox',
  name: 'SOX Financial Controls Pack',
  description: 'Implements SOX Section 302/404 controls for AI agents performing financial operations.',
  category: 'financial',
  version: '1.0',
  tier_required: 'pro',
  rules: [
    segregationOfDuties,
    journalEntryLimit,
    noRetroactiveEntries,
    auditTrailMandatory,
  ],
};
