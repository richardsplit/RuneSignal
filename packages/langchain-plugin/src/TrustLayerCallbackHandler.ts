/**
 * TrustLayer LangChain Callback Handler
 *
 * Intercepts all LangChain agent tool calls and:
 * 1. Signs every tool call and result into the S3 ledger
 * 2. Routes high-risk actions through HITL approval before execution
 *
 * Usage:
 *   const agent = AgentExecutor.fromAgentAndTools({
 *     callbacks: [new TrustLayerCallbackHandler(tl)]
 *   });
 */

import type { TrustLayer } from '@trustlayer/sdk';

// Minimal interface to avoid requiring langchain as a hard dep at type-check time
interface BaseCallbackHandlerInput {
  ignoreLLM?: boolean;
  ignoreChain?: boolean;
  ignoreAgent?: boolean;
}

export class TrustLayerCallbackHandler {
  name = 'TrustLayerCallbackHandler';
  ignoreLLM = false;
  ignoreChain = true;
  ignoreAgent = false;

  constructor(private tlClient: TrustLayer) {}

  /**
   * Called when a LangChain tool starts execution.
   * Signs the tool call into the ledger.
   */
  async handleToolStart(
    tool: { name: string; description?: string },
    input: string | Record<string, unknown>
  ): Promise<void> {
    try {
      await this.tlClient.ledger.sign({
        type: 'langchain.tool_start',
        payload: {
          tool: tool.name,
          input: typeof input === 'string' ? { raw: input } : input,
        },
      });
    } catch (err) {
      console.warn('[TrustLayer] ledger.sign failed (non-fatal):', err);
    }
  }

  /**
   * Called when a LangChain tool finishes.
   * Signs the result into the ledger.
   */
  async handleToolEnd(output: string): Promise<void> {
    try {
      await this.tlClient.ledger.sign({
        type: 'langchain.tool_end',
        payload: { output: output.slice(0, 2000) }, // Truncate large outputs
      });
    } catch (err) {
      console.warn('[TrustLayer] ledger.sign failed (non-fatal):', err);
    }
  }

  /**
   * Called when a LangChain tool errors.
   */
  async handleToolError(err: Error): Promise<void> {
    try {
      await this.tlClient.ledger.sign({
        type: 'langchain.tool_error',
        payload: { error: err.message },
      });
    } catch {
      // ignore
    }
  }

  /**
   * Called when an agent decides to take an action.
   * Evaluates policy and gates execution through HITL if required.
   */
  async handleAgentAction(action: {
    tool: string;
    toolInput: Record<string, unknown>;
    log?: string;
  }): Promise<void> {
    try {
      // Evaluate whether this action requires human oversight
      const policy = await this.tlClient.policy.evaluate({
        tool: action.tool,
        toolInput: action.toolInput,
      });

      if (policy.requiresHuman) {
        const approval = await this.tlClient.hitl.requestApproval({
          action: action.tool,
          payload: action.toolInput,
          blastRadius: policy.blastRadius,
          context: {
            triggeringPrompt: action.log,
          },
        });

        if (approval.status !== 'approved') {
          throw new Error(
            `[TrustLayer] Action "${action.tool}" rejected by human reviewer. ` +
            `Status: ${approval.status}. Note: ${approval.reviewerNote || 'none'}`
          );
        }
      }
    } catch (err) {
      // Re-throw HITL rejection errors, swallow infrastructure errors
      if (String(err).includes('rejected by human reviewer')) {
        throw err;
      }
      console.warn('[TrustLayer] policy evaluation failed (non-fatal):', err);
    }
  }

  /**
   * Called when an agent finishes.
   */
  async handleAgentEnd(action: { returnValues: Record<string, unknown> }): Promise<void> {
    try {
      await this.tlClient.ledger.sign({
        type: 'langchain.agent_end',
        payload: { return_values: action.returnValues },
      });
    } catch {
      // ignore
    }
  }
}
