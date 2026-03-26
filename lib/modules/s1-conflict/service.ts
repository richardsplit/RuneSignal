import { createAdminClient } from '../../db/supabase';
import { EmbeddingService } from '../../ai/embeddings';
import { PolicyEngine } from './policy-engine';
import { AuditLedgerService } from '../../ledger/service';
import { RegisterIntentRequest, ArbiterResponse } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ArbiterService {
  /**
   * Mediates an agent's intent before it performs an action.
   */
  static async mediateIntent(tenantId: string, agentId: string, request: RegisterIntentRequest): Promise<ArbiterResponse> {
    const supabase = createAdminClient();
    
    // 1. Generate Semantic Embedding
    const embedding = await EmbeddingService.generate(request.intent_description);

    // 2. Evaluate against Block Policies
    const policyResult = await PolicyEngine.evaluatePolicy(tenantId, embedding);
    if (policyResult.blocked) {
      await this.logArbiterEvent(tenantId, agentId, request.intent_description, 'block', policyResult.reason!);
      return { 
        decision: 'block', 
        reason: policyResult.reason!, 
        suggested_action: 'Modify intent to comply with corporate policy.' 
      };
    }

    // 3. Check for Concurrent Conflicts (Racing conditions/Inconsistencies)
    const conflictResult = await PolicyEngine.checkConcurrentConflicts(tenantId, agentId, embedding);
    if (conflictResult.conflict) {
      await this.logArbiterEvent(tenantId, agentId, request.intent_description, 'queue', conflictResult.reason!);
      return { 
        decision: 'queue', 
        reason: conflictResult.reason!, 
        suggested_action: 'Wait for conflicting agent to complete or request HITL resolution.' 
      };
    }

    // 4. Register Intent (Succesful mediation)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (request.ttl_seconds || 60));

    const { error: insertError } = await supabase
      .from('agent_intents')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        intent_description: request.intent_description,
        embedding,
        status: 'allowed',
        metadata: request.metadata || {},
        expires_at: expiresAt.toISOString()
      });

    if (insertError) throw new Error('Failed to register mediated intent');

    await this.logArbiterEvent(tenantId, agentId, request.intent_description, 'allow', 'No conflicts detected.');
    
    return { decision: 'allow', reason: 'Intent meditated and allowed.' };
  }

  private static async logArbiterEvent(tenantId: string, agentId: string, intent: string, decision: string, reason: string) {
    await AuditLedgerService.appendEvent({
      event_type: `arbiter.decision.${decision}`,
      module: 's1',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { intent, decision, reason }
    });
  }
}
