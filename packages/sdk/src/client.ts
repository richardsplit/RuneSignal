import type { RuneSignalConfig } from './types';
import { HitlClient } from './hitl';
import { LedgerClient } from './ledger';
import { AgentsClient } from './agents';
import { PolicyClient } from './policy';

export class RuneSignal {
  readonly hitl: HitlClient;
  readonly ledger: LedgerClient;
  readonly agents: AgentsClient;
  readonly policy: PolicyClient;

  private readonly config: Required<RuneSignalConfig>;

  constructor(config: RuneSignalConfig) {
    if (!config.apiKey) {
      throw new Error('[RuneSignal] apiKey is required. Set TL_API_KEY environment variable.');
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://app.runesignal.io',
      agentId: config.agentId || 'unknown-agent',
      timeout: config.timeout || 30000,
    };

    this.hitl = new HitlClient(this.config);
    this.ledger = new LedgerClient(this.config);
    this.agents = new AgentsClient(this.config);
    this.policy = new PolicyClient(this.config);
  }

  /**
   * Convenience: wrap an async action with automatic HITL gating.
   * If the action requires human approval, blocks until a decision is made.
   *
   * @example
   * const result = await tl.wrap(
   *   { action: 'send_email', payload: { to: 'ceo@corp.com' }, blastRadius: 'high', reversible: false },
   *   async () => { await sendEmail(...); }
   * );
   */
  async wrap<T>(
    options: import('./types').RequestApprovalOptions,
    fn: () => Promise<T>
  ): Promise<T> {
    const approval = await this.hitl.requestApproval(options);

    if (approval.status === 'approved') {
      return fn();
    }

    if (approval.status === 'rejected') {
      throw new Error(`[RuneSignal] Action rejected by human reviewer. Note: ${approval.reviewerNote || 'none'}`);
    }

    throw new Error(`[RuneSignal] Action expired or could not be reviewed. Status: ${approval.status}`);
  }
}
