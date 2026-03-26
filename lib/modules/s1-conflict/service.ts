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
    const vendor = request.vendor || 'openai';
    const apiKey = request.apiKey;
    
    // 1. Policy Evaluation
    if (vendor === 'claude') {
      // For Claude, we fetch All policies for this tenant to provide as context
      const { data: policies } = await supabase
        .from('arbiter_policies')
        .select('name, description')
        .eq('tenant_id', tenantId);
      
      const result = await PolicyEngine.evaluateWithClaude(request.intent_description, policies || [], apiKey);
      if (result.blocked) {
        await this.logArbiterEvent(tenantId, agentId, request.intent_description, 'block', result.reason!, vendor);
        return { decision: 'block', reason: result.reason!, suggested_action: 'Modify intent to comply with corporate policy.' };
      }
    } else {
      // OpenAI Default Path: Embedding + Vector Similarity
      const embedding = await EmbeddingService.generate(request.intent_description, apiKey);
      const policyResult = await PolicyEngine.evaluatePolicy(tenantId, embedding, apiKey);
      console.log(`[S1 DEBUG] Intent: "${request.intent_description}" | Blocked: ${policyResult.blocked} | Reason: ${policyResult.reason}`);
      
      if (policyResult.blocked) {
        await this.logArbiterEvent(tenantId, agentId, request.intent_description, 'block', policyResult.reason!, vendor);
        return { decision: 'block', reason: policyResult.reason!, suggested_action: 'Modify intent to comply with corporate policy.' };
      }

      // Check for Concurrent Conflicts
      const conflictResult = await PolicyEngine.checkConcurrentConflicts(tenantId, agentId, embedding, apiKey);
      if (conflictResult.conflict) {
        await this.logArbiterEvent(tenantId, agentId, request.intent_description, 'queue', conflictResult.reason!, vendor);
        return { decision: 'queue', reason: conflictResult.reason!, suggested_action: 'Wait for conflicting agent to complete.' };
      }
    }

    // 2. Register Intent (Succesful mediation)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (request.ttl_seconds || 60));

    // We still generate an embedding for the intent feed visualization if using Claude,
    // using mock if no OpenAI key is available.
    const finalEmbedding = vendor === 'openai' ? 
      await EmbeddingService.generate(request.intent_description, apiKey) : 
      await EmbeddingService.generate(request.intent_description); // Fallback to mock/default

    const { error: insertError } = await supabase
      .from('agent_intents')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        intent_description: request.intent_description,
        embedding: finalEmbedding,
        status: 'allowed',
        metadata: { ...request.metadata || {}, vendor },
        expires_at: expiresAt.toISOString()
      });

    if (insertError) throw new Error('Failed to register mediated intent');

    await this.logArbiterEvent(tenantId, agentId, request.intent_description, 'allow', 'No conflicts detected.', vendor);
    
    return { decision: 'allow', reason: 'Intent meditated and allowed.' };
  }

  /**
   * Releases/Deletes a specifically registered intent.
   */
  static async releaseIntent(tenantId: string, intentId: string): Promise<boolean> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('agent_intents')
      .delete()
      .eq('id', intentId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to release intent: ${error.message}`);
    
    await AuditLedgerService.appendEvent({
      event_type: 'arbiter.intent_released',
      module: 's1',
      tenant_id: tenantId,
      request_id: intentId,
      payload: { status: 'released' }
    });

    return true;
  }

  /**
   * Overrides/Updates an existing intent (e.g. extending TTL).
   */
  static async overrideIntent(tenantId: string, intentId: string, updates: any): Promise<any> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('agent_intents')
      .update(updates)
      .eq('id', intentId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to override intent: ${error.message}`);

    await AuditLedgerService.appendEvent({
      event_type: 'arbiter.intent_override',
      module: 's1',
      tenant_id: tenantId,
      request_id: intentId,
      payload: { updates }
    });

    return data;
  }

  private static async logArbiterEvent(tenantId: string, agentId: string, intent: string, decision: string, reason: string, vendor: string = 'openai') {
    await AuditLedgerService.appendEvent({
      event_type: `arbiter.decision.${decision}`,
      module: 's1',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { intent, decision, reason, vendor }
    });
  }
}
