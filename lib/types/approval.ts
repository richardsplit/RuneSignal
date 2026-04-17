/**
 * Approval Request Types & Action Taxonomy
 *
 * Standardized categories for actions requiring human approval,
 * mapped to EU AI Act articles, GDPR, HIPAA, SOX, and ISO 42001 clauses.
 */

import { BlastRadiusResult } from '@lib/hitl/blastRadiusScorer';
import { IntegrationProvider } from '@lib/integrations/types';

export type ActionCategory =
  | 'financial'       // EU AI Act Art 9 (risk), SOX
  | 'pii'             // GDPR, HIPAA, EU AI Act Art 10
  | 'deploy'          // EU AI Act Art 26 (deployer obligations)
  | 'comms'           // EU AI Act Art 13 (transparency)
  | 'infrastructure'  // ISO 42001 Clause 8.5
  | 'data_deletion'   // GDPR Art 17 (right to erasure)
  | 'model_update';   // EU AI Act Art 15 (accuracy), ISO 42001 Clause 9.1

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  agent_id: string;
  action: {
    category: ActionCategory;
    description: string;
    tool_name?: string;
    resource?: string;
    payload_summary?: Record<string, unknown>;
  };
  blast_radius: BlastRadiusResult;
  routing: {
    channels?: IntegrationProvider[];
    assigned_to?: string;
    require_mfa?: boolean;
  };
  sla: {
    deadline: string;
    auto_action?: 'approve' | 'reject' | 'escalate';
  };
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  decision?: {
    action: 'approve' | 'reject';
    decided_by: string;
    reason: string;
    decided_at: string;
    receipt_signature: string;
    receipt_event_id: string;
  };
  created_at: string;
  regulation_refs: string[];
}

/** Map action categories to default regulation references */
export const ACTION_REGULATION_MAP: Record<ActionCategory, string[]> = {
  financial: ['eu_ai_act:article_9', 'sox:section_302'],
  pii: ['gdpr:article_6', 'hipaa:phi_access', 'eu_ai_act:article_10'],
  deploy: ['eu_ai_act:article_26'],
  comms: ['eu_ai_act:article_13'],
  infrastructure: ['iso_42001:clause_8.5'],
  data_deletion: ['gdpr:article_17'],
  model_update: ['eu_ai_act:article_15', 'iso_42001:clause_9.1'],
};
