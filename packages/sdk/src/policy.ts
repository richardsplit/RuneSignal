import type { RuneSignalConfig, PolicyEvaluationResult, BlastRadius } from './types';

export class PolicyClient {
  constructor(private config: Required<RuneSignalConfig>) {}

  /**
   * Evaluate whether an action requires human oversight based on org policy.
   */
  async evaluate(action: {
    tool?: string;
    toolInput?: Record<string, unknown>;
    actionType?: string;
  }): Promise<PolicyEvaluationResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/enforce/tool-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          agent_id: this.config.agentId,
          tool: action.tool || action.actionType,
          input: action.toolInput || {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          requiresHuman: data.verdict === 'escalate' || data.requires_hitl === true,
          blastRadius: (data.blast_radius || 'low') as BlastRadius,
          reasons: data.reasons || [],
          policyVersion: data.policy_version || '1.0',
        };
      }
    } catch {
      // Fall back to local inference on error
    }

    // Local fallback: infer blast radius from action type
    const highRiskPatterns = ['delete', 'send_email', 'payment', 'deploy', 'admin', 'grant'];
    const actionStr = (action.tool || action.actionType || '').toLowerCase();
    const isHighRisk = highRiskPatterns.some(p => actionStr.includes(p));

    return {
      requiresHuman: isHighRisk,
      blastRadius: isHighRisk ? 'high' : 'low',
      reasons: isHighRisk ? [`Action matches high-risk pattern: ${actionStr}`] : [],
      policyVersion: 'local-fallback',
    };
  }
}
