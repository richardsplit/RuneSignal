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
import { ApprovalsResource } from './approvals';
import { EvidenceResource } from './evidence';
import { IncidentsResource } from './incidents';
import { ControlsResource } from './controls';
import { MetricsResource } from './metrics';
import { RuneSignalClientConfig } from './types';

export class RuneSignalClient {
  /** Firewall evaluation — allow / block / escalate any agent action */
  public readonly firewall: FirewallResource;
  /** Agent registration and inventory */
  public readonly agents: AgentsResource;
  /** HITL approval gateway — submit, poll, resolve */
  public readonly approvals: ApprovalsResource;
  /** Legacy exception tickets (superseded by approvals) */
  public readonly exceptions: ExceptionsResource;
  /** S3 provenance — Ed25519-sign any LLM call */
  public readonly provenance: ProvenanceResource;
  /** EU AI Act / ISO 42001 compliance evidence bundles */
  public readonly evidence: EvidenceResource;
  /** Incident reporting with idempotency */
  public readonly incidents: IncidentsResource;
  /** Compliance controls — seed, evaluate, health */
  public readonly controls: ControlsResource;
  /** Platform KPI metrics aggregate */
  public readonly metrics: MetricsResource;

  private readonly _baseClient: BaseClient;

  constructor(config: RuneSignalClientConfig) {
    this._baseClient = new BaseClient(config);
    this.firewall    = new FirewallResource(this._baseClient);
    this.agents      = new AgentsResource(this._baseClient);
    this.approvals   = new ApprovalsResource(this._baseClient);
    this.exceptions  = new ExceptionsResource(this._baseClient);
    this.provenance  = new ProvenanceResource(this._baseClient);
    this.evidence    = new EvidenceResource(this._baseClient);
    this.incidents   = new IncidentsResource(this._baseClient);
    this.controls    = new ControlsResource(this._baseClient);
    this.metrics     = new MetricsResource(this._baseClient);
  }
}

export const VERSION = '1.0.0';

// Named exports for all types
export * from './types';
export * from './approvals';
export * from './evidence';
export * from './incidents';
export * from './controls';
export * from './metrics';
export { FirewallResource } from './firewall';
export { AgentsResource } from './agents';
export { ExceptionsResource } from './exceptions';
export { ProvenanceResource } from './provenance';
export { ApprovalsResource } from './approvals';
export { EvidenceResource } from './evidence';
export { IncidentsResource } from './incidents';
export { ControlsResource } from './controls';
export { MetricsResource } from './metrics';
