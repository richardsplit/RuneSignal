/**
 * RuneSignal Premium Policy Packs — Barrel Export
 *
 * Import the full registry for evaluation:
 *   import { POLICY_PACK_REGISTRY, evaluatePacks } from './policy-packs';
 */

export type { PolicyPack, PolicyRule, PolicyEvalContext, PolicyViolation } from './types';

export { HipaaCompliancePack } from './hipaa';
export { SoxFinancialControlsPack } from './sox';
export { GdprDataProtectionPack } from './gdpr';
export { PciDssPaymentSecurityPack } from './pci-dss';

import { HipaaCompliancePack } from './hipaa';
import { SoxFinancialControlsPack } from './sox';
import { GdprDataProtectionPack } from './gdpr';
import { PciDssPaymentSecurityPack } from './pci-dss';
import type { PolicyPack, PolicyEvalContext, PolicyViolation } from './types';

/**
 * All registered policy packs, keyed by pack id.
 * Used by the PolicyEngine to look up installed packs at runtime.
 */
export const POLICY_PACK_REGISTRY: Record<string, PolicyPack> = {
  hipaa: HipaaCompliancePack,
  sox: SoxFinancialControlsPack,
  gdpr: GdprDataProtectionPack,
  'pci-dss': PciDssPaymentSecurityPack,
};

/**
 * Evaluate a set of installed pack IDs against an action context.
 * Returns all violations found across all rules in all active packs.
 */
export function evaluatePacks(
  installedPackIds: string[],
  context: PolicyEvalContext
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const packId of installedPackIds) {
    const pack = POLICY_PACK_REGISTRY[packId];
    if (!pack) continue;

    for (const rule of pack.rules) {
      const violation = rule.evaluate(context);
      if (violation) violations.push(violation);
    }
  }

  return violations;
}
