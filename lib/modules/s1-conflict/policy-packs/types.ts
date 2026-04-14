/**
 * RuneSignal Premium Policy Packs — Shared Types
 *
 * Each policy pack exports a PolicyPack object containing the pack metadata
 * and an array of PolicyRule objects the PolicyEngine evaluates at runtime.
 */

export interface PolicyRule {
  /** Unique slug within the pack */
  id: string;
  name: string;
  description: string;
  /** Governance domain the rule belongs to */
  domain: 'compliance' | 'security' | 'finance' | 'privacy' | 'operations';
  /**
   * Evaluate whether a given agent action violates this rule.
   * Returns null if the rule does not apply, or a violation message.
   */
  evaluate(context: PolicyEvalContext): PolicyViolation | null;
}

export interface PolicyEvalContext {
  action: string;
  resource?: string;
  tool_name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  /** Extra structured fields the caller provides (e.g. amount, record_count) */
  [key: string]: unknown;
}

export interface PolicyViolation {
  rule_id: string;
  rule_name: string;
  message: string;
  severity: 'block' | 'escalate' | 'warn';
}

export interface PolicyPack {
  id: string;           // Matches the slug in the DB name
  name: string;
  description: string;
  category: string;
  version: string;
  tier_required: 'starter' | 'pro' | 'enterprise';
  rules: PolicyRule[];
}
