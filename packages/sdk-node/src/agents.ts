/**
 * RuneSignal Node SDK — Agents Resource
 */

import { BaseClient } from './client';
import { RegisterAgentRequest, RegisterAgentResponse, Agent } from './types';

export class AgentsResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Registers a new AI agent and returns credentials + JWT token.
   *
   * @example
   * const { agent, token } = await tl.agents.register({
   *   agentName: 'Finance Bot',
   *   agentType: 'finance',
   *   scopes: [{ resource: 'finance:invoices', actions: ['read', 'create'] }]
   * });
   */
  async register(request: RegisterAgentRequest): Promise<RegisterAgentResponse> {
    const body = {
      agent_name: request.agentName,
      agent_type: request.agentType,
      framework: request.framework,
      public_key: request.publicKey,
      metadata: request.metadata,
      scopes: request.scopes?.map(s => ({
        resource: s.resource,
        actions: s.actions,
        conditions: s.conditions,
      })),
    };

    const raw: any = await (this.client as any).request('POST', '/api/v1/agents/register', { body });
    return {
      agent: mapAgent(raw.agent),
      token: raw.token,
    };
  }

  /**
   * Returns detailed agent information including scopes and risk score.
   */
  async get(agentId: string): Promise<{ agent: Agent; scopes: any[]; riskScore: number | null }> {
    const raw: any = await (this.client as any).request('GET', `/api/v1/agents/${agentId}`);
    return {
      agent: mapAgent(raw.agent),
      scopes: raw.scopes || [],
      riskScore: raw.risk_score,
    };
  }

  /**
   * Suspends an agent.
   */
  async suspend(agentId: string, reason?: string): Promise<void> {
    await (this.client as any).request('PATCH', `/api/v1/agents/${agentId}`, {
      body: { status: 'suspended', reason: reason || 'Suspended via SDK' },
    });
  }

  /**
   * Reactivates a suspended agent.
   */
  async reactivate(agentId: string): Promise<void> {
    await (this.client as any).request('PATCH', `/api/v1/agents/${agentId}`, {
      body: { status: 'active' },
    });
  }

  /**
   * Permanently revokes an agent.
   */
  async revoke(agentId: string, reason?: string): Promise<void> {
    await (this.client as any).request('DELETE', `/api/v1/agents/${agentId}`, {
      body: { reason: reason || 'Revoked via SDK' },
    });
  }

  /**
   * Rotates the agent's JWT token.
   */
  async rotateToken(agentId: string): Promise<{ token: string }> {
    return (this.client as any).request('POST', `/api/v1/agents/${agentId}/rotate`);
  }
}

function mapAgent(raw: any): Agent {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    agentName: raw.agent_name,
    agentType: raw.agent_type,
    status: raw.status,
    framework: raw.framework,
    metadata: raw.metadata,
    createdAt: raw.created_at,
  };
}
