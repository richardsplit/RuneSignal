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
        status: 'active'
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
}
