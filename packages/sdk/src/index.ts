/**
 * @trustlayer/sdk
 *
 * AI Agent Compliance Middleware — EU AI Act ready
 *
 * @example
 * import { TrustLayer } from '@trustlayer/sdk';
 *
 * const tl = new TrustLayer({ apiKey: process.env.TL_API_KEY });
 *
 * const result = await tl.hitl.requestApproval({
 *   agentId: 'sales-agent-v2',
 *   action: 'send_proposal_email',
 *   payload: { to: 'ceo@bigcorp.com', subject: '...' },
 *   blastRadius: 'high',
 *   reversible: false,
 * });
 *
 * if (result.status === 'approved') {
 *   // proceed with action
 * }
 */

export { TrustLayer } from './client';
export { HitlClient } from './hitl';
export { LedgerClient } from './ledger';
export { AgentsClient } from './agents';
export { PolicyClient } from './policy';
export type {
  TrustLayerConfig,
  RequestApprovalOptions,
  ApprovalResponse,
  ApprovalStatus,
  BlastRadius,
  LedgerSignOptions,
  LedgerEntry,
  PolicyEvaluationResult,
} from './types';
