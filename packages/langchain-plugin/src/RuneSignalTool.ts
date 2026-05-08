/**
 * RuneSignalTool
 *
 * Wraps any LangChain tool with automatic HITL gating.
 * High-risk tool calls are blocked until a human approves them.
 */

import type { RuneSignalClient, BlastRadiusLevel } from 'runesignal';

export interface RuneSignalToolOptions {
  agentId: string;
  blastRadius?: BlastRadiusLevel;
  reversible?: boolean;
  requireApproval?: boolean;
}

/**
 * Wraps a tool's _call method with RuneSignal HITL gating.
 *
 * Usage with LangChain:
 *   const safeTool = wrapToolWithHITL(myTool, tl, { blastRadius: 'high', reversible: false });
 */
export function wrapToolWithHITL<T extends { name: string; _call: (input: string) => Promise<string> }>(
  tool: T,
  client: RuneSignalClient,
  options: RuneSignalToolOptions
): T {
  const originalCall = tool._call.bind(tool);

  tool._call = async (input: string): Promise<string> => {
    if (options.requireApproval) {
      const ticket = await client.approvals.requestApproval({
        agentId: options.agentId,
        actionType: tool.name,
        actionSummary: `Execute LangChain tool: ${tool.name}`,
        blastRadius: {
          level: options.blastRadius ?? 'medium',
          reversible: options.reversible ?? true,
        },
        payload: { input },
      });

      if (ticket.status !== 'approved') {
        return `Action rejected: human reviewer ${ticket.status} this action.`;
      }
    } else {
      const evaluation = await client.firewall.evaluate({
        action: tool.name,
        resource: 'langchain:tool',
        toolName: tool.name,
        metadata: { input },
      });

      if (evaluation.verdict === 'block') {
        return `Action blocked by RuneSignal firewall: ${evaluation.reasons.join('; ')}`;
      }

      if (evaluation.verdict === 'escalate' && evaluation.hitlTicketId) {
        const ticket = await client.approvals.poll(evaluation.hitlTicketId);
        if (ticket.status !== 'approved') {
          return `Action rejected: human reviewer ${ticket.status} this action.`;
        }
      }
    }

    return originalCall(input);
  };

  return tool;
}
