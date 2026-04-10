export type BlastRadius = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'escalated';

export interface TrustLayerConfig {
  apiKey: string;
  baseUrl?: string; // defaults to https://app.trustlayer.io
  agentId?: string;
  timeout?: number; // ms, default 30000
}

export interface RequestApprovalOptions {
  agentId?: string;          // overrides config.agentId
  action: string;            // action name / type
  payload: Record<string, unknown>;
  blastRadius?: BlastRadius;
  reversible?: boolean;
  context?: {
    sessionId?: string;
    userId?: string;
    triggeringPrompt?: string;
  };
  routing?: {
    channels?: string[];
    escalationMinutes?: number;
    autoApproveIfNoResponse?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface ApprovalResponse {
  approvalId: string;
  status: ApprovalStatus;
  decision: 'approved' | 'rejected' | null;
  decidedBy?: { userId: string; name: string } | null;
  decidedAt?: string | null;
  reviewerNote?: string | null;
  reviewUrl?: string;
  expiresAt?: string;
}

export interface LedgerSignOptions {
  type: string;
  agentId?: string;
  payload: Record<string, unknown>;
  sessionId?: string;
}

export interface LedgerEntry {
  entryId: string;
  type: string;
  agentId: string;
  signature: string;
  timestamp: string;
}

export interface PolicyEvaluationResult {
  requiresHuman: boolean;
  blastRadius: BlastRadius;
  reasons: string[];
  policyVersion: string;
}
