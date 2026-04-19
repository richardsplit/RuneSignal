/**
 * TrustLayerTool
 *
 * Wraps any LangChain tool with automatic HITL gating.
 * High-risk tool calls are blocked until a human approves them.
 */

import type { TrustLayer, BlastRadius } from '@runesignal/sdk';

export interface TrustLayerToolOptions {
  blastRadius?: BlastRadius;
  reversible?: boolean;
  requireApproval?: boolean; // Force approval regardless of policy
}

/**
 * Wraps a tool's _call method with TrustLayer HITL gating.
 *
 * Usage with LangChain:
 *   const safeTool = wrapToolWithHITL(myTool, tl, { blastRadius: 'high', reversible: false });
 */
export function wrapToolWithHITL<T extends { name: string; _call: (input: string) => Promise<string> }>(
  tool: T,
  tl: TrustLayer,
  options: TrustLayerToolOptions = {}
): T {
  const originalCall = tool._call.bind(tool);

  tool._call = async (input: string): Promise<string> => {
    if (options.requireApproval) {
      const approval = await tl.hitl.requestApproval({
        action: tool.name,
        payload: { input },
        blastRadius: options.blastRadius || 'medium',
        reversible: options.reversible ?? true,
      });

      if (approval.status !== 'approved') {
        return `Action rejected: human reviewer ${approval.status} this action. Note: ${approval.reviewerNote || 'none'}`;
      }
    } else {
      const policy = await tl.policy.evaluate({ tool: tool.name, toolInput: { input } });
      if (policy.requiresHuman) {
        const approval = await tl.hitl.requestApproval({
          action: tool.name,
          payload: { input },
          blastRadius: policy.blastRadius,
          reversible: options.reversible ?? true,
        });

        if (approval.status !== 'approved') {
          return `Action rejected: human reviewer ${approval.status} this action. Note: ${approval.reviewerNote || 'none'}`;
        }
      }
    }

    return originalCall(input);
  };

  return tool;
}
