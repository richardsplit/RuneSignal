/**
 * RuneSignal Node SDK — Approvals (HITL Gateway) Resource
 * POST /api/v1/approval-requests
 */

import { BaseClient } from './client';
import { RuneSignalError } from './types';

export type BlastRadiusLevel = 'low' | 'medium' | 'high' | 'critical';
export type SlaAutoAction = 'approve' | 'reject' | 'escalate';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface BlastRadius {
  level?: BlastRadiusLevel;
  reversible: boolean;
  affectsExternalSystem?: boolean;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  affectedRecordCount?: number;
  estimatedImpactUsd?: number;
}

export interface SubmitApprovalRequest {
  agentId: string;
  actionType: string;
  actionSummary: string;
  blastRadius: BlastRadius;
  payload?: Record<string, unknown>;
  slaHours?: number;
  slaAutoAction?: SlaAutoAction;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalTicket {
  id: string;
  agentId: string;
  actionType: string;
  actionSummary: string;
  status: ApprovalStatus;
  slaDeadline?: string;
  slaAutoAction?: SlaAutoAction;
  reviewUrl?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionReason?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export class ApprovalsResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Submit a HITL approval request.
   * Pass an idempotencyKey to make it safe to retry without creating duplicates.
   */
  async submit(request: SubmitApprovalRequest): Promise<ApprovalTicket> {
    const headers: Record<string, string> = {};
    if (request.idempotencyKey) {
      headers['Idempotency-Key'] = request.idempotencyKey;
    }

    const raw: any = await (this.client as any).request('POST', '/api/v1/approval-requests', {
      body: {
        agent_id: request.agentId,
        action_type: request.actionType,
        action_summary: request.actionSummary,
        blast_radius: {
          level: request.blastRadius.level,
          reversible: request.blastRadius.reversible,
          affects_external_system: request.blastRadius.affectsExternalSystem,
          data_classification: request.blastRadius.dataClassification,
          affected_record_count: request.blastRadius.affectedRecordCount,
          estimated_impact_usd: request.blastRadius.estimatedImpactUsd,
        },
        payload: request.payload,
        sla_hours: request.slaHours,
        sla_auto_action: request.slaAutoAction,
        idempotency_key: request.idempotencyKey,
        metadata: request.metadata,
      },
    });

    return mapTicket(raw);
  }

  /**
   * Poll for a decision on a pending approval ticket.
   * Resolves when status changes from 'pending' or timeout is reached.
   */
  async poll(ticketId: string, options: PollOptions = {}): Promise<ApprovalTicket> {
    const { intervalMs = 5_000, timeoutMs = 300_000 } = options;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const ticket = await this.get(ticketId);
      if (ticket.status !== 'pending') return ticket;
      await sleep(intervalMs);
    }

    throw new RuneSignalError(
      `Approval poll timed out after ${timeoutMs}ms for ticket ${ticketId}`,
      408,
      'APPROVAL_POLL_TIMEOUT'
    );
  }

  /**
   * Submit and wait for a decision in one call.
   * Polls automatically at 5s intervals.
   */
  async requestApproval(
    request: SubmitApprovalRequest,
    pollOptions: PollOptions = {}
  ): Promise<ApprovalTicket> {
    const ticket = await this.submit(request);
    return this.poll(ticket.id, pollOptions);
  }

  /** Get a ticket by ID. */
  async get(ticketId: string): Promise<ApprovalTicket> {
    const raw: any = await (this.client as any).request('GET', `/api/v1/approval-requests/${ticketId}`);
    return mapTicket(raw);
  }

  /**
   * Manually resolve a ticket (approve or reject).
   * Used by review apps and dashboard integrations.
   */
  async resolve(
    ticketId: string,
    decision: { action: 'approve' | 'reject'; reviewerId: string; reason?: string }
  ): Promise<ApprovalTicket> {
    const raw: any = await (this.client as any).request(
      'POST',
      `/api/v1/approval-requests/${ticketId}/resolve`,
      {
        body: {
          action: decision.action,
          reviewer_id: decision.reviewerId,
          reason: decision.reason,
        },
      }
    );
    return mapTicket(raw);
  }

  /** List recent approval tickets. */
  async list(options: { status?: ApprovalStatus; limit?: number; agentId?: string } = {}): Promise<ApprovalTicket[]> {
    const query: Record<string, string> = {};
    if (options.status)  query.status   = options.status;
    if (options.limit)   query.limit    = String(options.limit);
    if (options.agentId) query.agent_id = options.agentId;

    const raw: any[] = await (this.client as any).request('GET', '/api/v1/approval-requests', { query });
    return raw.map(mapTicket);
  }
}

function mapTicket(raw: any): ApprovalTicket {
  return {
    id:                raw.id,
    agentId:           raw.agent_id,
    actionType:        raw.action_type,
    actionSummary:     raw.action_summary,
    status:            raw.status,
    slaDeadline:       raw.sla_deadline,
    slaAutoAction:     raw.sla_auto_action,
    reviewUrl:         raw.review_url,
    resolvedBy:        raw.resolved_by,
    resolvedAt:        raw.resolved_at,
    resolutionReason:  raw.resolution_reason,
    idempotencyKey:    raw.idempotency_key,
    createdAt:         raw.created_at,
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
