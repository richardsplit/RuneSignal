/**
 * RuneSignal LangChain Callback Handler
 *
 * Intercepts all LangChain agent tool calls and:
 * 1. Signs every tool call and result into the S3 ledger
 * 2. Routes high-risk actions through HITL approval before execution
 *
 * Usage:
 *   const agent = AgentExecutor.fromAgentAndTools({
 *     callbacks: [new RuneSignalCallbackHandler(tl)]
 *   });
 */

import type { RuneSignalClient } from 'runesignal';

// Minimal interface to avoid requiring langchain as a hard dep at type-check time
interface BaseCallbackHandlerInput {
  ignoreLLM?: boolean;
  ignoreChain?: boolean;
  ignoreAgent?: boolean;
}

export class RuneSignalCallbackHandler {
  name = 'RuneSignalCallbackHandler';
  ignoreLLM = false;
  ignoreChain = true;
  ignoreAgent = false;

  constructor(private tlClient: RuneSignalClient) {}

  /**
   * Called when a LangChain tool starts execution.
   * Signs the tool call into the ledger.
   */
  async handleToolStart(
    tool: { name: string; description?: string },
    input: string | Record<string, unknown>
  ): Promise<void> {
    try {
      await this.tlClient.provenance.certify({
        provider: 'custom',
        model: 'langchain',
        prompt: `tool_start:${tool.name}`,
        completion: typeof input === 'string' ? input : JSON.stringify(input),
        metadata: { event: 'tool_start', tool: tool.name },
      });
    } catch (err) {
      console.warn('[RuneSignal] ledger.sign failed (non-fatal):', err);
    }
  }

  /**
   * Called when a LangChain tool finishes.
   * Signs the result into the ledger.
   */
  async handleToolEnd(output: string): Promise<void> {
    try {
      await this.tlClient.provenance.certify({
        provider: 'custom',
        model: 'langchain',
        prompt: 'tool_end',
        completion: output.slice(0, 2000),
        metadata: { event: 'tool_end' },
      });
    } catch (err) {
      console.warn('[RuneSignal] ledger.sign failed (non-fatal):', err);
    }
  }

  /**
   * Called when a LangChain tool errors.
   */
  async handleToolError(err: Error): Promise<void> {
    try {
      await this.tlClient.provenance.certify({
        provider: 'custom',
        model: 'langchain',
        prompt: 'tool_error',
        completion: err.message,
        metadata: { event: 'tool_error' },
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
      // Evaluate through the firewall — escalate verdict triggers HITL
      const evaluation = await this.tlClient.firewall.evaluate({
        action: action.tool,
        resource: 'langchain:tool',
        toolName: action.tool,
        metadata: action.toolInput,
      });

      if (evaluation.verdict === 'block') {
        throw new Error(
          `[RuneSignal] Action "${action.tool}" blocked by firewall. Reasons: ${evaluation.reasons.join('; ')}`
        );
      }

      if (evaluation.verdict === 'escalate' && evaluation.hitlTicketId) {
        const approval = await this.tlClient.approvals.poll(evaluation.hitlTicketId);
        if (approval.status !== 'approved') {
          throw new Error(
            `[RuneSignal] Action "${action.tool}" ${approval.status} by human reviewer.`
          );
        }
      }
    } catch (err) {
      // Re-throw HITL rejection errors, swallow infrastructure errors
      if (String(err).includes('rejected by human reviewer')) {
        throw err;
      }
      console.warn('[RuneSignal] policy evaluation failed (non-fatal):', err);
    }
  }

  /**
   * Called when an agent finishes.
   */
  async handleAgentEnd(action: { returnValues: Record<string, unknown> }): Promise<void> {
    try {
      await this.tlClient.provenance.certify({
        provider: 'custom',
        model: 'langchain',
        prompt: 'agent_end',
        completion: JSON.stringify(action.returnValues).slice(0, 2000),
        metadata: { event: 'agent_end' },
      });
    } catch {
      // ignore
    }
  }
}
