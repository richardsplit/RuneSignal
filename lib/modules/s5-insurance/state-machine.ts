import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { CertificateService } from '../s3-provenance/certificate';
import { IdentityService } from '../s6-identity/service';
import { HitlService } from '../s7-hitl/service';
import { v4 as uuidv4 } from 'uuid';

export type ClaimState =
  | 'fnol'           // First Notice of Loss — entry state
  | 'triaged'        // Coverage check complete
  | 'investigating'  // Fraud + liability analysis
  | 'pending_hitl'   // Routed to human reviewer
  | 'decided'        // AI decision made
  | 'payment_queue'  // Approved, payment scheduled
  | 'paid'           // Payment issued — terminal
  | 'denied';        // Denied — terminal

const VALID_TRANSITIONS: Record<ClaimState, ClaimState[]> = {
  fnol:          ['triaged'],
  triaged:       ['investigating', 'denied'],
  investigating: ['pending_hitl', 'decided', 'denied'],
  pending_hitl:  ['decided', 'denied'],
  decided:       ['payment_queue', 'denied'],
  payment_queue: ['paid'],
  paid:          [],
  denied:        [],
};

// FCRA/NAIC compliance thresholds
const HIGH_VALUE_THRESHOLD_USD = 50000;
const HIGH_FRAUD_SCORE = 0.7;

export class ClaimsStateMachine {
  static async transition(
    tenantId: string,
    agentId: string,
    claimId: string,
    targetState: ClaimState,
    reason: string
  ): Promise<{ success: boolean; claim?: any; error?: string }> {
    const supabase = createAdminClient();

    // STEP 1 — S6: Validate agent has write permission on insurance:claims
    const permCheck = await IdentityService.validatePermission(
      agentId, 'insurance:claims', 'write'
    );
    if (!permCheck.allowed) {
      return { success: false, error: `S6 denied: ${permCheck.reason}` };
    }

    // STEP 2 — Fetch current claim
    const { data: claim, error: fetchErr } = await supabase
      .from('insurance_claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !claim) return { success: false, error: 'Claim not found' };

    const currentState = (claim.claim_state || 'fnol') as ClaimState;

    // STEP 3 — Validate the transition is allowed
    if (!VALID_TRANSITIONS[currentState].includes(targetState)) {
      return {
        success: false,
        error: `Invalid transition: ${currentState} → ${targetState}. Allowed: [${VALID_TRANSITIONS[currentState].join(', ')}]`
      };
    }

    // STEP 4 — FCRA/NAIC compliance check: auto-route high-value or high-fraud to HITL
    if (targetState === 'decided' && currentState !== 'pending_hitl') {
      const needsHitl =
        claim.financial_impact > HIGH_VALUE_THRESHOLD_USD ||
        (claim.fraud_score || 0) > HIGH_FRAUD_SCORE;

      if (needsHitl) {
        const ticket = await HitlService.createException(tenantId, agentId, {
          title: `[S5] High-risk claim requires human review — ${claimId.slice(0, 8)}`,
          description: `Impact: $${claim.financial_impact} | Fraud score: ${(claim.fraud_score || 0).toFixed(2)} | Rule: ${claim.financial_impact > HIGH_VALUE_THRESHOLD_USD ? 'FCRA high-value' : 'ATP-002 fraud'}`,
          priority: claim.financial_impact > 100000 ? 'critical' : 'high',
          context_data: { claim_id: claimId, financial_impact: claim.financial_impact, fraud_score: claim.fraud_score }
        });
        // Redirect to pending_hitl instead
        return this.transition(tenantId, agentId, claimId, 'pending_hitl', `HITL auto-routed: ticket ${ticket.id}`);
      }
    }

    // STEP 5 — Apply DB state update
    const { data: updated } = await supabase
      .from('insurance_claims')
      .update({
        claim_state: targetState,
        resolved_at: ['paid', 'denied'].includes(targetState) ? new Date().toISOString() : null
      })
      .eq('id', claimId)
      .select()
      .single();

    // STEP 6 — S3: Certify the state transition (tamper-evident proof in ledger)
    await CertificateService.certifyCall(tenantId, agentId, {
      provider: 'openai',
      model: 'rules-engine-v1',
      user_messages: [{ role: 'system', content: `Claim ${claimId}: ${currentState} → ${targetState}` }],
      completion_text: reason,
      tags: ['insurance', 's5', 'state-transition', targetState]
    });

    // STEP 7 — Audit ledger
    await AuditLedgerService.appendEvent({
      event_type: `insurance.claim.${targetState}`,
      module: 's5',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { claim_id: claimId, from: currentState, to: targetState, reason }
    });

    return { success: true, claim: updated };
  }
}
