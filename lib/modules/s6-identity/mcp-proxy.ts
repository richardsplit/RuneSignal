import { IdentityService } from './service';
import { ConscienceEngine } from '../s8-moralos/conscience';
import { ROBO_DOMAIN_MAP } from '../s8-moralos/types';
import { createAdminClient } from '../../db/supabase';
import { getTenantFailMode } from '../firewall/tenant-fail-mode';

/**
 * MCP Proxy Enforcement logic.
 * This can be used as a standalone library within an MCP server or proxied via an API.
 */
export class McpEnforcementProxy {
  /**
   * Enforces a tool call based on the agent's permission manifest AND Corporate SOUL.
   * 1. S6 Permission check
   * 2. S8 Moral check (ConscienceEngine)
   */
  static async enforceToolCall(agentId: string, toolName: string, tenantId?: string): Promise<{ allowed: boolean; reason: string; moral_verdict?: string }> {
    // Step 1: S6 Permission check
    const permResult = await IdentityService.validatePermission(agentId, `tool:${toolName}`, 'execute');
    if (!permResult.allowed) {
      return permResult;
    }

    // Step 2: S8 Moral check (if tenantId available)
    if (tenantId) {
      try {
        // Look up agent to determine domain
        const supabase = createAdminClient();
        const { data: agent } = await supabase
          .from('agent_credentials')
          .select('agent_type, metadata')
          .eq('id', agentId)
          .single();

        const domain = (agent?.metadata?.moral_domain as string) || ROBO_DOMAIN_MAP[agent?.agent_type as string] || 'ops';

        const moral = await ConscienceEngine.evaluate(tenantId, {
          agent_id: agentId,
          action_description: `Tool call: ${toolName}`,
          domain,
          action_metadata: { tool_name: toolName }
        });

        if (moral.verdict !== 'clear') {
          return {
            allowed: false,
            reason: `Moral conflict: ${moral.conflict_reason || 'Action blocked by Corporate SOUL'}`,
            moral_verdict: moral.verdict
          };
        }
      } catch (e) {
        // Configurable: fail-open (default) or fail-closed for tool calls
        const failMode = await getTenantFailMode(tenantId);
        if (failMode === 'closed') {
          console.warn(`[FAIL-CLOSED] ConscienceEngine check failed for tenant ${tenantId}, blocking tool call:`, e);
          return { allowed: false, reason: 'Moral check failed and tenant fail_mode is closed' };
        }
        console.warn('ConscienceEngine check failed, allowing tool call (fail-open):', e);
      }
    }

    return { allowed: true, reason: 'Permission granted and moral check passed' };
  }
}
