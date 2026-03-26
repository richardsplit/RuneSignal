import { createAdminClient } from '../../db/supabase';
import { EmbeddingService } from '../../ai/embeddings';

export class PolicyEngine {
  /**
   * Checks if an intent violates any established semantic policies.
   */
  static async evaluatePolicy(tenantId: string, embedding: number[]): Promise<{ blocked: boolean; policyName?: string; reason?: string }> {
    const supabase = createAdminClient();

    // Semantic search for matching "block" policies in arbiter_policies
    // Using a simple cosine similarity threshold (0.8+)
    const { data: matches, error } = await supabase.rpc('match_policies', {
        query_embedding: embedding,
        match_threshold: 0.85, 
        match_count: 1,
        p_tenant_id: tenantId
    });

    if (error) {
      console.error('Policy evaluation RPC failed:', error);
      return { blocked: false }; // Fail open for MVP, log error
    }

    if (matches && matches.length > 0) {
      const policy = matches[0];
      return { 
        blocked: true, 
        policyName: policy.name, 
        reason: `Violates policy: ${policy.description}` 
      };
    }

    return { blocked: false };
  }

  /**
   * Detects semantic overlap with other active agent intents in the registry.
   */
  static async checkConcurrentConflicts(tenantId: string, agentId: string, embedding: number[]): Promise<{ conflict: boolean; conflictingAgentId?: string; reason?: string }> {
    const supabase = createAdminClient();

    // Query active intents from other agents that haven't expired
    const { data: conflicts, error } = await supabase.rpc('match_active_intents', {
        query_embedding: embedding,
        match_threshold: 0.9, // High similarity indicates likely collision
        match_count: 1,
        p_tenant_id: tenantId,
        p_exclude_agent_id: agentId
    });

    if (error) return { conflict: false };

    if (conflicts && conflicts.length > 0) {
      const collision = conflicts[0];
      return { 
        conflict: true, 
        conflictingAgentId: collision.agent_id,
        reason: `Collision detected with active agent ${collision.agent_id}: "${collision.intent_description}"`
      };
    }

    return { conflict: false };
  }
}
