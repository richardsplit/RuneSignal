import type { TrustLayerConfig } from './types';

export interface AgentRegistration {
  agentId: string;
  registered: boolean;
}

export class AgentsClient {
  constructor(private config: Required<TrustLayerConfig>) {}

  /**
   * Auto-register this agent in the organization's agent inventory.
   * Called automatically on TrustLayer client instantiation if autoRegister is true.
   */
  async register(options: {
    agentId?: string;
    name?: string;
    framework?: string;
    platform?: string;
    model?: string;
    metadata?: Record<string, unknown>;
  } = {}): Promise<AgentRegistration> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/agents/inventory/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        agent_id: options.agentId || this.config.agentId,
        name: options.name || options.agentId || this.config.agentId,
        framework: options.framework,
        platform: options.platform,
        model: options.model,
        metadata: options.metadata || {},
      }),
    });

    if (!response.ok) {
      console.warn('[TrustLayer] Agent auto-registration failed (non-fatal)');
      return { agentId: this.config.agentId, registered: false };
    }

    const data = await response.json();
    return { agentId: data.agent_id || this.config.agentId, registered: data.registered };
  }
}
