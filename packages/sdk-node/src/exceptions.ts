/**
 * TrustLayer Node SDK — Exceptions (HITL) Resource
 */

import { BaseClient } from './client';
import { CreateExceptionRequest, ExceptionTicket, ResolveExceptionRequest } from './types';

export class ExceptionsResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Creates a new HITL exception ticket for human review.
   */
  async create(request: CreateExceptionRequest, agentId?: string): Promise<ExceptionTicket> {
    const raw: any = await (this.client as any).request('POST', '/api/v1/exceptions', {
      body: {
        title: request.title,
        description: request.description,
        priority: request.priority,
        context_data: request.contextData,
      },
      agentId,
    });
    return mapTicket(raw);
  }

  /**
   * Lists open HITL tickets.
   */
  async list(options: { limit?: number } = {}): Promise<ExceptionTicket[]> {
    const query: Record<string, string> = {};
    if (options.limit) query.limit = String(options.limit);

    const raw: any[] = await (this.client as any).request('GET', '/api/v1/exceptions', { query });
    return raw.map(mapTicket);
  }

  /**
   * Resolves a ticket (approve or reject).
   *
   * @example
   * await tl.exceptions.resolve(ticketId, {
   *   action: 'approve',
   *   reviewerId: 'cfo@company.com',
   *   reason: 'Approved in board meeting'
   * });
   */
  async resolve(ticketId: string, request: ResolveExceptionRequest): Promise<ExceptionTicket> {
    const raw: any = await (this.client as any).request('POST', `/api/v1/exceptions/${ticketId}/resolve`, {
      body: {
        action: request.action,
        reviewer_id: request.reviewerId,
        reason: request.reason,
      },
    });
    return mapTicket(raw);
  }
}

function mapTicket(raw: any): ExceptionTicket {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    agentId: raw.agent_id,
    title: raw.title,
    description: raw.description,
    priority: raw.priority,
    status: raw.status,
    slaDeadline: raw.sla_deadline,
    resolvedBy: raw.resolved_by,
    resolutionReason: raw.resolution_reason,
    resolvedAt: raw.resolved_at,
    createdAt: raw.created_at,
  };
}
