/**
 * RuneSignal Node SDK — Firewall Resource
 * POST /api/v1/firewall/evaluate
 */

import { BaseClient } from './client';
import {
  EvaluateRequest,
  EvaluateResponse,
  FirewallBlockError,
} from './types';

export class FirewallResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Evaluates an agent action through the full RuneSignal governance pipeline.
   *
   * @param request - The action to evaluate
   * @param options - Optional agentId override
   * @returns EvaluateResponse with verdict: 'allow' | 'block' | 'escalate'
   * @throws FirewallBlockError if verdict is 'block'
   *
   * @example
   * const result = await tl.firewall.evaluate({
   *   action: 'delete_user_record',
   *   resource: 'crm:contacts',
   *   description: 'Delete customer record per GDPR request'
   * });
   * if (result.verdict === 'escalate') {
   *   console.log('Waiting for human approval:', result.hitlTicketId);
   * }
   */
  async evaluate(
    request: EvaluateRequest,
    options: { agentId?: string; throwOnBlock?: boolean } = {}
  ): Promise<EvaluateResponse> {
    const { throwOnBlock = false, agentId } = options;

    const body = {
      action: request.action,
      resource: request.resource,
      tool_name: request.toolName,
      description: request.description,
      domain: request.domain,
      metadata: request.metadata,
      risk_threshold: request.riskThreshold,
    };

    // The API returns 403 for block verdicts — we catch that and re-parse
    let raw: any;
    try {
      raw = await (this.client as any).request('POST', '/api/v1/firewall/evaluate', {
        body,
        agentId: agentId || request.agentId,
      });
    } catch (e: any) {
      // 403 from firewall = block verdict, parse the response body
      if (e.status === 403 && e.detail) {
        raw = e.detail;
      } else {
        throw e;
      }
    }

    const result: EvaluateResponse = {
      evaluationId: raw.evaluation_id,
      verdict: raw.verdict,
      riskScore: raw.risk_score,
      checks: (raw.checks || []).map((c: any) => ({
        check: c.check,
        passed: c.passed,
        detail: c.detail,
        latencyMs: c.latency_ms,
      })),
      reasons: raw.reasons || [],
      certificateId: raw.certificate_id,
      hitlTicketId: raw.hitl_ticket_id,
      latencyMs: raw.latency_ms,
    };

    if (throwOnBlock && result.verdict === 'block') {
      throw new FirewallBlockError(result);
    }

    return result;
  }

  /**
   * Lists recent firewall evaluations.
   */
  async list(options: { limit?: number; verdict?: 'allow' | 'block' | 'escalate' } = {}): Promise<EvaluateResponse[]> {
    const query: Record<string, string> = {};
    if (options.limit) query.limit = String(options.limit);
    if (options.verdict) query.verdict = options.verdict;

    const raw: any[] = await (this.client as any).request('GET', '/api/v1/firewall/evaluations', { query });
    return raw.map(r => ({
      evaluationId: r.id,
      verdict: r.verdict,
      riskScore: r.risk_score,
      checks: r.checks || [],
      reasons: r.reasons || [],
      certificateId: r.certificate_id,
      hitlTicketId: r.hitl_ticket_id,
      latencyMs: r.latency_ms,
    }));
  }
}
