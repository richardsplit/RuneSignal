/**
 * RuneSignal PCI-DSS Payment Security Policy Pack
 *
 * Enforces PCI-DSS v4.0 requirements for AI agents handling cardholder data:
 * no CHD storage, PAN masking, encrypted transmission, two-person rule.
 *
 * Tier: Enterprise
 */

import type { PolicyPack, PolicyRule, PolicyEvalContext, PolicyViolation } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHD_KEYWORDS = [
  'cardholder', 'pan', 'card_number', 'cvv', 'cvc', 'cvv2',
  'expiry', 'credit_card', 'debit_card', 'payment_card', 'pci',
  'stripe_token', 'card_data', 'chd',
];

// Pattern: full PAN (13-19 digits, may include spaces/dashes)
const PAN_REGEX = /\b(?:\d[ -]?){13,19}\b/;

// Pattern: masked PAN acceptable format (e.g. ****-****-****-1234 or 4111-XXXX-XXXX-1111)
const MASKED_PAN_REGEX = /^[\*Xx]{4,}[\*Xx\- ]*\d{4}$/;

function touchesChd(ctx: PolicyEvalContext): boolean {
  const haystack = [
    ctx.action,
    ctx.resource ?? '',
    ctx.tool_name ?? '',
    ctx.description ?? '',
  ].join(' ').toLowerCase();
  return CHD_KEYWORDS.some(kw => haystack.includes(kw));
}

function containsUnmaskedPan(value: unknown): boolean {
  if (typeof value === 'string') {
    // If it matches PAN_REGEX but NOT the masked pattern, it's unmasked
    return PAN_REGEX.test(value) && !MASKED_PAN_REGEX.test(value);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).some(containsUnmaskedPan);
  }
  return false;
}

// ─── Rules ───────────────────────────────────────────────────────────────────

const noChdStorage: PolicyRule = {
  id: 'pci-no-chd-storage',
  name: 'No CHD storage',
  description: 'Agent must not store full cardholder data (PAN, CVV) in any system.',
  domain: 'security',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesChd(ctx)) return null;

    const isStorageAction =
      /store|save|write|insert|persist|upload|cache/i.test(ctx.action) ||
      /store|save|write|insert|persist|upload|cache/i.test(ctx.tool_name ?? '');
    if (!isStorageAction) return null;

    const hasCvv =
      typeof ctx.cvv === 'string' && ctx.cvv.length > 0;
    const hasRawPan = containsUnmaskedPan(ctx.pan) || containsUnmaskedPan(ctx.card_number);

    if (hasCvv || hasRawPan) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: 'PCI-DSS violation: attempting to store full cardholder data (PAN/CVV). CVV must never be stored; PAN must be tokenised or truncated.',
        severity: 'block',
      };
    }
    return null;
  },
};

const maskPanInLogs: PolicyRule = {
  id: 'pci-mask-pan-in-logs',
  name: 'Mask PAN in audit logs',
  description: 'Primary Account Numbers must be masked or truncated in all audit log payloads.',
  domain: 'security',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesChd(ctx)) return null;

    const isLoggingAction =
      /log|audit|record|trace|debug|print/i.test(ctx.action) ||
      /log|audit|record|trace|debug|print/i.test(ctx.tool_name ?? '');
    if (!isLoggingAction) return null;

    if (containsUnmaskedPan(ctx.metadata)) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: 'PCI-DSS violation: unmasked PAN detected in audit log metadata. Truncate to last 4 digits or replace with token before logging.',
        severity: 'block',
      };
    }
    return null;
  },
};

const encryptChdInTransit: PolicyRule = {
  id: 'pci-encrypt-in-transit',
  name: 'Encrypt CHD in transit',
  description: 'Cardholder data must only be transmitted over encrypted channels.',
  domain: 'security',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesChd(ctx)) return null;

    const isTransmission =
      /send|transmit|post|forward|push|submit/i.test(ctx.action) ||
      /send|transmit|post|forward|push|submit/i.test(ctx.tool_name ?? '');
    if (!isTransmission) return null;

    const endpoint = typeof ctx.endpoint === 'string' ? ctx.endpoint : '';
    const isEncrypted = endpoint.startsWith('https://') || endpoint.startsWith('wss://');
    const isLocalhost = endpoint.includes('localhost') || endpoint.includes('127.0.0.1');

    if (endpoint && !isEncrypted && !isLocalhost) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `PCI-DSS violation: cardholder data transmission to "${endpoint}" uses an unencrypted channel. Use HTTPS or WSS.`,
        severity: 'block',
      };
    }
    return null;
  },
};

const twoPersonRuleForChdAccess: PolicyRule = {
  id: 'pci-two-person-rule',
  name: 'Two-person rule for CHD access',
  description: 'Access to cardholder data requires two-person authorisation.',
  domain: 'security',
  evaluate(ctx: PolicyEvalContext): PolicyViolation | null {
    if (!touchesChd(ctx)) return null;

    const isDirectAccess =
      /read|fetch|get|query|decrypt|access/i.test(ctx.action) ||
      /read|fetch|get|query|decrypt|access/i.test(ctx.tool_name ?? '');
    if (!isDirectAccess) return null;

    const authorizerCount = Array.isArray(ctx.authorizers)
      ? (ctx.authorizers as string[]).length
      : 0;

    if (authorizerCount < 2) {
      return {
        rule_id: this.id,
        rule_name: this.name,
        message: `PCI-DSS two-person rule: CHD access requires 2 authorizers in metadata.authorizers (found ${authorizerCount}).`,
        severity: 'block',
      };
    }
    return null;
  },
};

// ─── Pack export ─────────────────────────────────────────────────────────────

export const PciDssPaymentSecurityPack: PolicyPack = {
  id: 'pci-dss',
  name: 'PCI-DSS Payment Security Pack',
  description: 'Enforces PCI-DSS requirements for AI agents handling cardholder data.',
  category: 'payment',
  version: '1.0',
  tier_required: 'enterprise',
  rules: [
    noChdStorage,
    maskPanInLogs,
    encryptChdInTransit,
    twoPersonRuleForChdAccess,
  ],
};
