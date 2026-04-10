import type { RuneSignalConfig, RequestApprovalOptions, ApprovalResponse, ApprovalStatus } from './types';

export class HitlClient {
  constructor(private config: Required<RuneSignalConfig>) {}

  /**
   * Submit an agent action for human approval.
   * Polls until a decision is made (approved/rejected/expired).
   *
   * @example
   * const result = await tl.hitl.requestApproval({
   *   agentId: 'sales-agent-v2',
   *   action: 'send_proposal_email',
   *   payload: { to: 'ceo@bigcorp.com', subject: '...' },
   *   blastRadius: 'high',
   *   reversible: false,
   * });
   *
   * if (result.status === 'approved') {
   *   // proceed
   * }
   */
  async requestApproval(options: RequestApprovalOptions): Promise<ApprovalResponse> {
    const response = await this._fetch('/api/v1/hitl/approvals', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: options.agentId || this.config.agentId,
        action_type: options.action,
        action_description: `Action: ${options.action}`,
        action_payload: options.payload,
        blast_radius: options.blastRadius,
        reversible: options.reversible ?? true,
        context: {
          session_id: options.context?.sessionId,
          user_id: options.context?.userId,
          triggering_prompt: options.context?.triggeringPrompt,
        },
        routing: options.routing,
        metadata: options.metadata,
      }),
    });

    const created = await response.json();
    if (!response.ok) {
      throw new Error(`[RuneSignal HITL] Failed to create approval: ${created.error || response.status}`);
    }

    return this._pollUntilDecision(created.approval_id);
  }

  /**
   * Create an approval request without waiting for a decision.
   */
  async createApproval(options: RequestApprovalOptions): Promise<{ approvalId: string; reviewUrl: string; expiresAt: string }> {
    const response = await this._fetch('/api/v1/hitl/approvals', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: options.agentId || this.config.agentId,
        action_type: options.action,
        action_description: `Action: ${options.action}`,
        action_payload: options.payload,
        blast_radius: options.blastRadius,
        reversible: options.reversible ?? true,
        context: options.context,
        routing: options.routing,
        metadata: options.metadata,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`[RuneSignal HITL] ${data.error || response.status}`);

    return {
      approvalId: data.approval_id,
      reviewUrl: data.review_url,
      expiresAt: data.expires_at,
    };
  }

  /**
   * Get the current status of an approval request.
   */
  async getApproval(approvalId: string): Promise<ApprovalResponse> {
    const response = await this._fetch(`/api/v1/hitl/approvals/${approvalId}`);
    if (!response.ok) throw new Error(`[RuneSignal HITL] Approval not found: ${approvalId}`);
    const data = await response.json();
    return this._mapResponse(data);
  }

  private async _pollUntilDecision(
    approvalId: string,
    intervalMs = 3000,
    maxAttempts = 60
  ): Promise<ApprovalResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const approval = await this.getApproval(approvalId);
      const terminal: ApprovalStatus[] = ['approved', 'rejected', 'expired'];
      if (terminal.includes(approval.status)) {
        return approval;
      }
      await this._sleep(intervalMs);
    }
    return { approvalId, status: 'expired', decision: null };
  }

  private _mapResponse(data: any): ApprovalResponse {
    return {
      approvalId: data.approval_id,
      status: data.status,
      decision: data.decision,
      decidedBy: data.decided_by,
      decidedAt: data.decided_at,
      reviewerNote: data.reviewer_note,
      reviewUrl: data.review_url,
      expiresAt: data.expires_at,
    };
  }

  private async _fetch(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.config.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(options.headers || {}),
      },
    });
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
