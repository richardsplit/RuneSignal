import { createAdminClient } from '../../db/supabase';
import { EmbeddingService } from '../../ai/embeddings';

export class PolicyEngine {
  /**
   * Checks if an intent violates any established semantic policies.
   */
  static async evaluatePolicy(tenantId: string, embedding: number[], customApiKey?: string): Promise<{ blocked: boolean; policyName?: string; reason?: string }> {
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
   * Performs deep semantic mediation using Claude (Anthropic).
   * This reasons about the intent against a provided list of policies.
   */
  static async evaluateWithClaude(intent: string, policies: any[], apiKey?: string): Promise<{ blocked: boolean; reason?: string }> {
    const apiToken = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiToken) {
      throw new Error('Claude API Key missing for S1 mediation');
    }

    const policyContext = policies.map(p => `- ${p.name}: ${p.description}`).join('\n');
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiToken,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `You are the TrustLayer S1 Arbiter. Evaluate the following AI agent intent against our corporate policies.
            
            POLICIES:
            ${policyContext}
            
            INTENT:
            "${intent}"
            
            Decision Rule: If the intent violates ANY policy, return BLOCKED with the reason. Otherwise return ALLOWED.
            Format your response as valid JSON: {"decision": "block" | "allow", "reason": "concise explanation"}`
          }]
        })
      });

      const data = await response.json();
      const text = data.content[0].text;
      const result = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
      
      return {
        blocked: result.decision === 'block',
        reason: result.reason
      };
    } catch (error) {
      console.error('Claude Mediation Failed:', error);
      return { blocked: false }; // Fail open or return error
    }
  }

  /**
   * Detects semantic overlap with other active agent intents in the registry.
   */
  static async checkConcurrentConflicts(tenantId: string, agentId: string, embedding: number[], customApiKey?: string): Promise<{ conflict: boolean; conflictingAgentId?: string; reason?: string }> {
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
