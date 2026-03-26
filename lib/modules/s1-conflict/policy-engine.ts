import { createAdminClient } from '../../db/supabase';
import { EmbeddingService } from '../../ai/embeddings';

export class PolicyEngine {
  /**
   * Checks if an intent violates any established semantic policies.
   */
  static async evaluatePolicy(tenantId: string, embedding: number[], threshold?: number): Promise<{ blocked: boolean; policyName?: string; reason?: string }> {
    const supabase = createAdminClient();
    const matchThreshold = threshold || parseFloat(process.env.S1_POLICY_THRESHOLD || '0.85');

    const { data: matches, error } = await supabase.rpc('match_policies', {
        query_embedding: embedding,
        match_threshold: matchThreshold, 
        match_count: 5,
        p_tenant_id: tenantId
    });

    console.log(`[S1 RPC DEBUG] Threshold: ${matchThreshold} | Tenant: ${tenantId} | Matches: ${matches?.length || 0}`);
    
    // Fallback: Client-side similarity if RPC fails or returns 0
    let finalMatches = matches || [];
    if (finalMatches.length === 0) {
        console.log('[S1] RPC returned 0 matches, attempting client-side fallback...');
        const { data: allPolicies } = await supabase
            .from('arbiter_policies')
            .select('*')
            .eq('tenant_id', tenantId);
        
        if (allPolicies) {
            finalMatches = allPolicies.map(p => {
                const similarity = this.calculateCosineSimilarity(embedding, p.embedding);
                return { ...p, similarity };
            }).filter(p => p.similarity > matchThreshold)
              .sort((a, b) => b.similarity - a.similarity);
            
            console.log(`[S1 Fallback] Found ${finalMatches.length} matches via JS.`);
        }
    }

    if (error && finalMatches.length === 0) {
      console.error('Policy evaluation RPC failed:', error);
      return { blocked: false };
    }

    if (finalMatches.length > 0) {
      const policy = finalMatches[0];
      return { 
        blocked: true, 
        policyName: policy.name, 
        reason: `Violates policy: ${policy.description}` 
      };
    }

    return { blocked: false };
  }

  /**
   * Helper for client-side vector similarity.
   */
  private static calculateCosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += (a[i] || 0) * (b[i] || 0);
        normA += (a[i] || 0) * (a[i] || 0);
        normB += (b[i] || 0) * (b[i] || 0);
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Performs deep semantic mediation using Claude (Anthropic).
   */
  static async evaluateWithClaude(intent: string, policies: any[]): Promise<{ blocked: boolean; reason?: string }> {
    const apiToken = process.env.ANTHROPIC_API_KEY;
    if (!apiToken) {
      throw new Error('Claude API Key missing for S1 mediation (ANTHROPIC_API_KEY)');
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
      return { blocked: false };
    }
  }

  /**
   * Detects semantic overlap with other active agent intents in the registry.
   */
  static async checkConcurrentConflicts(tenantId: string, agentId: string, embedding: number[], threshold?: number): Promise<{ conflict: boolean; conflictingAgentId?: string; reason?: string }> {
    const supabase = createAdminClient();
    const matchThreshold = threshold || parseFloat(process.env.S1_CONCURRENT_THRESHOLD || '0.9');

    const { data: conflicts, error } = await supabase.rpc('match_active_intents', {
        query_embedding: embedding,
        match_threshold: matchThreshold, 
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
        reason: collision.intent_description
      };
    }

    return { conflict: false };
  }
}
