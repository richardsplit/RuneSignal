/**
 * @runesignal/sdk — Official Node.js SDK for RuneSignal
 *
 * RuneSignal is the AI Agent Action Firewall for Enterprise Systems.
 * Control what your agents can do, enforce policy, route approvals,
 * and record every decision in a tamper-evident audit trail.
 *
 * @example
 * import { RuneSignalClient } from '@runesignal/sdk';
 *
 * const tl = new RuneSignalClient({
 *   apiKey: 'tl_your_api_key',
 *   agentId: 'your-agent-uuid',
 * });
 *
 * const result = await tl.firewall.evaluate({
 *   action: 'delete_user_record',
 *   resource: 'crm:contacts',
 *   description: 'Delete customer record per GDPR request',
 * });
 *
 * if (result.verdict === 'allow') {
 *   // Proceed with the action
 * } else if (result.verdict === 'escalate') {
 *   console.log('Pending human approval. Ticket:', result.hitlTicketId);
 * }
 */

import { BaseClient } from './client';
import { FirewallResource } from './firewall';
import { AgentsResource } from './agents';
import { ExceptionsResource } from './exceptions';
import { ProvenanceResource } from './provenance';
import { RuneSignalClientConfig } from './types';

export class RuneSignalClient {
  public readonly firewall: FirewallResource;
  public readonly agents: AgentsResource;
  public readonly exceptions: ExceptionsResource;
  public readonly provenance: ProvenanceResource;

  private readonly _baseClient: BaseClient;

  constructor(config: RuneSignalClientConfig) {
    this._baseClient = new BaseClient(config);
    this.firewall = new FirewallResource(this._baseClient);
    this.agents = new AgentsResource(this._baseClient);
    this.exceptions = new ExceptionsResource(this._baseClient);
    this.provenance = new ProvenanceResource(this._baseClient);
  }
}

// Named exports for all types
export * from './types';
export { FirewallResource } from './firewall';
export { AgentsResource } from './agents';
export { ExceptionsResource } from './exceptions';
export { ProvenanceResource } from './provenance';
