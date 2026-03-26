import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';

export type ClaimState = 'filed' | 'under_review' | 'approved' | 'denied' | 'processing';

/**
 * ClaimsStateMachine handles formal state transitions for insurance incidents.
 * Ensures that claims follow a valid business process and are audited.
 */
export class ClaimsStateMachine {
  private static validTransitions: Record<ClaimState, ClaimState[]> = {
    'filed': ['under_review'],
    'under_review': ['approved', 'denied'],
    'approved': ['processing'],
    'processing': [], // Terminal or linked to external Guidewire status
    'denied': []
  };

  /**
   * Transitions a claim to a new state if valid.
   */
  static async transition(tenantId: string, claimId: string, newState: ClaimState, reviewerId?: string): Promise<any> {
    const supabase = createAdminClient();

    // 1. Fetch current status
    const { data: current, error: fetchError } = await supabase
      .from('insurance_claims')
      .select('claim_state, agent_id')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !current) throw new Error('Claim not found');

    const currentState = current.claim_state as ClaimState;

    // 2. Validate transition
    if (!this.validTransitions[currentState].includes(newState)) {
      throw new Error(`Invalid transition: ${currentState} -> ${newState}`);
    }

    // 3. Apply Update
    const { data: updated, error: updateError } = await supabase
      .from('insurance_claims')
      .update({
        claim_state: newState,
        resolved_at: (newState === 'approved' || newState === 'denied') ? new Date().toISOString() : null
      })
      .eq('id', claimId)
      .select()
      .single();

    if (updateError) throw new Error(`Transition failed: ${updateError.message}`);

    // 4. Audit
    await AuditLedgerService.appendEvent({
      event_type: 'insurance.claim_transitioned',
      module: 's5',
      tenant_id: tenantId,
      agent_id: current.agent_id,
      request_id: claimId,
      payload: { from: currentState, to: newState, reviewer: reviewerId }
    });

    return updated;
  }
}
