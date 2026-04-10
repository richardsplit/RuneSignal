/**
 * RuneSignal Firewall Service (S0 — Unified Control Plane)
 *
 * Orchestrates all governance modules into a single evaluation pipeline:
 *   S6 Identity  →  S1 Policy + S8 Moral (parallel)  →  S5 Risk  →  S7 HITL  →  S3 Audit
 *
 * Pattern source: lib/modules/s6-identity/mcp-proxy.ts (existing S6+S8 chain)
 */

import { IdentityService } from '../s6-identity/service';
import { PolicyEngine } from '../s1-conflict/policy-engine';
import { ConscienceEngine } from '../s8-moralos/conscience';
import { RiskEngine } from '../s5-insurance/risk-engine';
import { HitlService } from '../s7-hitl/service';
import { AuditLedgerService } from '../../ledger/service';
import { EmbeddingService } from '../../ai/embeddings';
import { createAdminClient } from '../../db/supabase';
import { ROBO_DOMAIN_MAP } from '../s8-moralos/types';
import { v4 as uuidv4 } from 'uuid';
import {
  FirewallRequest,
  FirewallResponse,
  FirewallVerdict,
  FirewallCheckResult,
} from './types';

const DEFAULT_RISK_THRESHOLD = 50;

export class FirewallService {
  /**
   * Evaluates an agent action through the full RuneSignal governance pipeline.
   * Returns a composite verdict: allow | block | escalate.
   */
  static async evaluate(tenantId: string, req: FirewallRequest): Promise<FirewallResponse> {
    const startTime = Date.now();
    const evaluationId = uuidv4();
    const checks: FirewallCheckResult[] = [];
    const reasons: string[] = [];
    let verdict: FirewallVerdict = 'allow';
    let riskScore = 0;
    let hitlTicketId: string | undefined;

    // ─── Step 1: S6 Identity & Permissions (fast-fail) ──────────────────────
    const s6Start = Date.now();
    const permResult = await IdentityService.validatePermission(
      req.agent_id,
      req.resource,
      req.action
    );
    checks.push({
      check: 's6_identity',
      passed: permResult.allowed,
      detail: permResult.reason,
      latency_ms: Date.now() - s6Start,
    });

    if (!permResult.allowed) {
      verdict = 'block';
      reasons.push(`Identity: ${permResult.reason}`);
      return await FirewallService._finalise(
        evaluationId, tenantId, req, verdict, riskScore, checks, reasons, startTime
      );
    }

    // ─── Step 2: S1 Policy + S8 Moral in parallel ───────────────────────────
    const actionText = req.description || `${req.action} on ${req.resource}`;

    // Resolve moral domain
    const supabase = createAdminClient();
    const { data: agentRow } = await supabase
      .from('agent_credentials')
      .select('agent_type, metadata')
      .eq('id', req.agent_id)
      .single();

    const domain =
      req.domain ||
      (agentRow?.metadata?.moral_domain as string | undefined) ||
      ROBO_DOMAIN_MAP[agentRow?.agent_type as string] ||
      'ops';

    const parallelStart = Date.now();
    const [policyResult, moralResult] = await Promise.allSettled([
      // S1: generate embedding and check policies
      EmbeddingService.generate(actionText).then(embedding =>
        PolicyEngine.evaluatePolicy(tenantId, embedding)
      ),
      // S8: conscience evaluation
      ConscienceEngine.evaluate(tenantId, {
        agent_id: req.agent_id,
        action_description: actionText,
        domain,
        action_metadata: req.metadata || {},
      }),
    ]);

    const parallelLatency = Date.now() - parallelStart;

    // S1 result
    if (policyResult.status === 'fulfilled') {
      const policy = policyResult.value;
      checks.push({
        check: 's1_policy',
        passed: !policy.blocked,
        detail: policy.blocked ? (policy.reason || 'Policy violation') : 'No policy conflicts',
        latency_ms: parallelLatency,
      });
      if (policy.blocked) {
        verdict = 'block';
        reasons.push(`Policy: ${policy.reason || policy.policyName || 'Action blocked by policy'}`);
      }
    } else {
      checks.push({
        check: 's1_policy',
        passed: true, // fail-open for policy
        detail: 'Policy check skipped (evaluation error)',
        latency_ms: parallelLatency,
      });
    }

    // S8 result — only escalate/block if S1 hasn't already blocked
    if (moralResult.status === 'fulfilled') {
      const moral = moralResult.value;
      const moralPassed = moral.verdict === 'clear';
      checks.push({
        check: 's8_moral',
        passed: moralPassed,
        detail: moralPassed
          ? 'Corporate SOUL: clear'
          : `Moral ${moral.verdict}: ${moral.conflict_reason || 'Action conflicts with Corporate SOUL'}`,
        latency_ms: parallelLatency,
      });
      if (!moralPassed && verdict === 'allow') {
        if (moral.verdict === 'block') {
          verdict = 'block';
          reasons.push(`MoralOS: ${moral.conflict_reason || 'Hard block by Corporate SOUL'}`);
        } else if (moral.verdict === 'pause') {
          verdict = 'escalate';
          reasons.push(`MoralOS: ${moral.conflict_reason || 'Escalation required by Corporate SOUL'}`);
        }
      }
    } else {
      checks.push({
        check: 's8_moral',
        passed: true, // fail-open for moral — matching existing mcp-proxy behaviour
        detail: 'Moral check skipped (evaluation error)',
        latency_ms: parallelLatency,
      });
    }

    // ─── Step 3: S5 Risk Scoring ─────────────────────────────────────────────
    const s5Start = Date.now();
    try {
      const riskProfile = await RiskEngine.refreshAgentRiskProfile(tenantId, req.agent_id);
      const { score, factors } = RiskEngine.computeRiskScore(riskProfile);
      riskScore = score;
      const threshold = req.risk_threshold ?? DEFAULT_RISK_THRESHOLD;
      const riskPassed = score <= threshold;

      checks.push({
        check: 's5_risk',
        passed: riskPassed,
        detail: `Risk score: ${score}/100 (threshold: ${threshold}). Factors: ${factors.join(', ')}`,
        latency_ms: Date.now() - s5Start,
      });

      if (!riskPassed && verdict === 'allow') {
        verdict = 'escalate';
        reasons.push(`Risk: score ${score} exceeds threshold ${threshold}`);
      }
    } catch (e) {
      checks.push({
        check: 's5_risk',
        passed: true, // fail-open for risk
        detail: 'Risk scoring skipped (evaluation error)',
        latency_ms: Date.now() - s5Start,
      });
    }

    // ─── Step 4: S7 Auto-HITL (if verdict = escalate) ───────────────────────
    if (verdict === 'escalate') {
      try {
        const priority = riskScore >= 75 ? 'high' : riskScore >= 50 ? 'medium' : 'low';
        const ticket = await HitlService.createException(tenantId, req.agent_id, {
          title: `[FIREWALL] ${req.action} on ${req.resource}`,
          description: [
            `Agent ${req.agent_id} attempted: ${actionText}`,
            `Risk score: ${riskScore}/100`,
            `Reasons: ${reasons.join('; ')}`,
          ].join('\n'),
          priority: priority as 'critical' | 'high' | 'medium' | 'low',
          context_data: {
            evaluation_id: evaluationId,
            action: req.action,
            resource: req.resource,
            tool_name: req.tool_name,
            risk_score: riskScore,
            reasons,
            metadata: req.metadata,
          },
        });
        hitlTicketId = ticket.id;
      } catch (e) {
        console.error('[Firewall] Failed to create HITL ticket:', e);
      }
    }

    return await FirewallService._finalise(
      evaluationId, tenantId, req, verdict, riskScore, checks, reasons, startTime, hitlTicketId
    );
  }

  /**
   * Persists the evaluation result and appends to the immutable audit ledger.
   */
  private static async _finalise(
    evaluationId: string,
    tenantId: string,
    req: FirewallRequest,
    verdict: FirewallVerdict,
    riskScore: number,
    checks: FirewallCheckResult[],
    reasons: string[],
    startTime: number,
    hitlTicketId?: string
  ): Promise<FirewallResponse> {
    const latencyMs = Date.now() - startTime;

    // Write to firewall_evaluations table
    const supabase = createAdminClient();
    await supabase.from('firewall_evaluations').insert({
      id: evaluationId,
      tenant_id: tenantId,
      agent_id: req.agent_id,
      action: req.action,
      resource: req.resource,
      verdict,
      risk_score: riskScore,
      checks,
      reasons,
      hitl_ticket_id: hitlTicketId || null,
      latency_ms: latencyMs,
    });

    // Append to immutable audit ledger (S3)
    let certificateId: string | undefined;
    try {
      const event = await AuditLedgerService.appendEvent({
        event_type: 'firewall.evaluation',
        module: 's6', // Closest module; firewall is the unified layer
        tenant_id: tenantId,
        agent_id: req.agent_id,
        request_id: evaluationId,
        payload: {
          evaluation_id: evaluationId,
          verdict,
          risk_score: riskScore,
          action: req.action,
          resource: req.resource,
          reasons,
          hitl_ticket_id: hitlTicketId || null,
          latency_ms: latencyMs,
        },
      });
      certificateId = event?.id;
    } catch (e) {
      console.error('[Firewall] Audit ledger write failed:', e);
    }

    return {
      evaluation_id: evaluationId,
      verdict,
      risk_score: riskScore,
      checks,
      reasons,
      certificate_id: certificateId,
      hitl_ticket_id: hitlTicketId,
      latency_ms: latencyMs,
    };
  }
}
