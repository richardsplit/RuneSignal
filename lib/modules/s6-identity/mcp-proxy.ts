import { IdentityService } from './service';

/**
 * MCP Proxy Enforcement logic.
 * This can be used as a standalone library within an MCP server or proxied via an API.
 */
export class McpEnforcementProxy {
  /**
   * Enforces a tool call based on the agent's permission manifest.
   * Logic:
   * 1. Extracts the agent's identity.
   * 2. Checks if the specific 'tool_name' is allowed for this agent.
   * 3. Blocks/Allows and writes to the sacred audit ledger.
   */
  static async enforceToolCall(agentId: string, toolName: string): Promise<{ allowed: boolean; reason: string }> {
    const resource = `tool:${toolName}`;
    const action = 'execute';

    return IdentityService.validatePermission(agentId, resource, action);
  }
}
