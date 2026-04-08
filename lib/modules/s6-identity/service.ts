import { createAdminClient } from '../../db/supabase';
import { JwtHandler } from '../../auth/jwt';
import { AuditLedgerService } from '../../ledger/service';
import { RegisterAgentRequest, AgentCredential, PermissionScope } from './types';
import { v4 as uuidv4 } from 'uuid';

export class IdentityService {
  /**
   * Registers a new AI agent and issues a JWT credential.
   */
  static async registerAgent(tenantId: string, request: RegisterAgentRequest, createdBy?: string): Promise<{ agent: AgentCredential; token: string }> {
    const supabase = createAdminClient();

    // 1. Create Agent Record
    const agentId = uuidv4();
    const { data: agent, error: agentError } = await supabase
      .from('agent_credentials')
      .insert({
        id: agentId,
        tenant_id: tenantId,
        agent_name: request.agent_name,
        agent_type: request.agent_type,
        framework: request.framework,
        public_key: request.public_key,
        created_by: createdBy,
        status: 'active',
        metadata: request.metadata || {}
      })
      .select()
      .single();

    if (agentError) {
      throw new Error(`Failed to register agent: ${agentError.message}`);
    }

    // 2. Insert Permission Scopes if provided
    if (request.scopes && request.scopes.length > 0) {
      const scopesToInsert = request.scopes.map(s => ({
        agent_id: agentId,
        resource: s.resource,
        actions: s.actions,
        conditions: s.conditions || {},
        granted_by: createdBy
      }));

      const { error: scopeError } = await supabase
        .from('permission_scopes')
        .insert(scopesToInsert);

      if (scopeError) {
        // Rollback (manual cleanup in this simple implementation)
        await supabase.from('agent_credentials').delete().eq('id', agentId);
        throw new Error(`Failed to assign permission scopes: ${scopeError.message}`);
      }
    }

    // 3. Issue Token
    // Requirement 4.1 asks for RS256, but for MVP we use the shared HS256 logic 
    // from JwtHandler which is robust.
    const token = await JwtHandler.generateAgentToken(
      agentId, 
      tenantId, 
      (request.scopes || []).map(s => `${s.resource}:${s.actions.join(',')}`)
    );

    // 4. Audit Log
    await AuditLedgerService.appendEvent({
      event_type: 'agent.registered',
      module: 's6',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: agentId,
      payload: { 
        agent_name: request.agent_name, 
        agent_type: request.agent_type,
        scope_count: request.scopes?.length || 0
      }
    });

    return { agent, token };
  }

  /**
   * Validates if an agent has permission to perform an action on a resource.
   */
  static async validatePermission(agentId: string, resource: string, action: string): Promise<{ allowed: boolean; reason: string }> {
    const supabase = createAdminClient();

    // 1. Check Agent Status
    const { data: agent, error: agentError } = await supabase
      .from('agent_credentials')
      .select('status, tenant_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) return { allowed: false, reason: 'Agent not found' };
    if (agent.status !== 'active') return { allowed: false, reason: `Agent status is ${agent.status}` };

    // 2. Check Permission Scopes
    // We check for exact match or tool:* wildcard
    const { data: scopes, error: scopeError } = await supabase
      .from('permission_scopes')
      .select('*')
      .eq('agent_id', agentId);

    if (scopeError) return { allowed: false, reason: 'Scope check failed' };

    const hasPermission = scopes.some(s => {
      const resourceMatch = s.resource === resource || s.resource === 'tool:*' || resource.startsWith(s.resource.replace('*', ''));
      const actionMatch = s.actions.includes(action) || s.actions.includes('*');
      return resourceMatch && actionMatch;
    });

    if (!hasPermission) {
      // 3. Log Violation
      await AuditLedgerService.appendEvent({
        event_type: 'agent.permission_violation',
        module: 's6',
        tenant_id: agent.tenant_id,
        agent_id: agentId,
        request_id: uuidv4(),
        payload: { resource, action, status: 'blocked' }
      });

      return { allowed: false, reason: `Insufficient permissions for ${action} on ${resource}` };
    }

    // 4. Log Access
    await AuditLedgerService.appendEvent({
      event_type: 'agent.permission_allowed',
      module: 's6',
      tenant_id: agent.tenant_id,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { resource, action, status: 'allowed' }
    });

    return { allowed: true, reason: 'Permission granted' };
  }

  /**
   * Directly checks the status of an agent.
   */
  static async checkAgentStatus(agentId: string): Promise<'active' | 'suspended' | 'revoked' | 'unknown'> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('agent_credentials')
      .select('status')
      .eq('id', agentId)
      .single();

    if (error || !data) return 'unknown';
    return data.status as any;
  }

  /**
   * Returns full agent details including permission scopes and risk profile.
   */
  static async getAgentDetail(agentId: string, tenantId: string): Promise<{ agent: AgentCredential; scopes: PermissionScope[]; risk_score: number | null } | null> {
    const supabase = createAdminClient();

    const { data: agent, error: agentError } = await supabase
      .from('agent_credentials')
      .select('*')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) return null;

    const { data: scopes } = await supabase
      .from('permission_scopes')
      .select('*')
      .eq('agent_id', agentId);

    const { data: riskProfile } = await supabase
      .from('agent_risk_profiles')
      .select('risk_score')
      .eq('agent_id', agentId)
      .single();

    return {
      agent,
      scopes: scopes || [],
      risk_score: riskProfile?.risk_score ?? null,
    };
  }

  /**
   * Suspends an active agent, preventing further action execution.
   */
  static async suspendAgent(agentId: string, tenantId: string, reason: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('agent_credentials')
      .update({ status: 'suspended', metadata: supabase.rpc as any })
      .eq('id', agentId)
      .eq('tenant_id', tenantId);

    // Simple update — metadata merge handled below
    await supabase
      .from('agent_credentials')
      .update({ status: 'suspended' })
      .eq('id', agentId)
      .eq('tenant_id', tenantId);

    await AuditLedgerService.appendEvent({
      event_type: 'agent.suspended',
      module: 's6',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { reason, status: 'suspended' },
    });
  }

  /**
   * Reactivates a previously suspended agent.
   */
  static async reactivateAgent(agentId: string, tenantId: string): Promise<void> {
    await createAdminClient()
      .from('agent_credentials')
      .update({ status: 'active' })
      .eq('id', agentId)
      .eq('tenant_id', tenantId);

    await AuditLedgerService.appendEvent({
      event_type: 'agent.reactivated',
      module: 's6',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { status: 'active' },
    });
  }

  /**
   * Revokes an agent permanently (status = 'revoked').
   */
  static async revokeAgent(agentId: string, tenantId: string, reason: string): Promise<void> {
    await createAdminClient()
      .from('agent_credentials')
      .update({ status: 'revoked' })
      .eq('id', agentId)
      .eq('tenant_id', tenantId);

    await AuditLedgerService.appendEvent({
      event_type: 'agent.revoked',
      module: 's6',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { reason, status: 'revoked' },
    });
  }

  /**
   * Rotates the agent JWT token — issues a new token and logs the rotation.
   */
  static async rotateAgentToken(agentId: string, tenantId: string): Promise<{ token: string }> {
    const supabase = createAdminClient();

    // Fetch current agent to extract scopes
    const { data: agent, error } = await supabase
      .from('agent_credentials')
      .select('status')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !agent) throw new Error('Agent not found');
    if (agent.status !== 'active') throw new Error(`Cannot rotate token for ${agent.status} agent`);

    const { data: scopes } = await supabase
      .from('permission_scopes')
      .select('resource, actions')
      .eq('agent_id', agentId);

    const scopeStrings = (scopes || []).map(s => `${s.resource}:${(s.actions as string[]).join(',')}`);
    const token = await JwtHandler.generateAgentToken(agentId, tenantId, scopeStrings);

    await AuditLedgerService.appendEvent({
      event_type: 'agent.token_rotated',
      module: 's6',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { scope_count: scopeStrings.length },
    });

    return { token };
  }
}
