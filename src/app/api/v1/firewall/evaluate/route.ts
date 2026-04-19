import { NextRequest, NextResponse } from 'next/server';
import { FirewallService } from '../../../../../../lib/modules/firewall/service';
import { FirewallRequest } from '../../../../../../lib/modules/firewall/types';
import { IncidentAutoDetector } from '../../../../../../lib/services/incident-auto-detector';

/**
 * POST /api/v1/firewall/evaluate
 *
 * Unified AI agent action firewall endpoint.
 * Chains S6 identity → S1 policy + S8 moral (parallel) → S5 risk → S7 HITL → S3 audit.
 *
 * Headers required:
 *   Authorization: Bearer tl_<api_key>   (resolved to X-Tenant-Id by middleware)
 *   X-Agent-Id: <agent_uuid>
 *
 * Returns: FirewallResponse { verdict: 'allow'|'block'|'escalate', risk_score, checks[], ... }
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const agentId = request.headers.get('X-Agent-Id');

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Missing X-Tenant-Id. Provide a valid API key via Authorization header.' },
      { status: 401 }
    );
  }

  if (!agentId) {
    return NextResponse.json(
      { error: 'Missing X-Agent-Id header. Agent identity is required for firewall evaluation.' },
      { status: 400 }
    );
  }

  let body: Partial<FirewallRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, resource, tool_name, description, domain, metadata, risk_threshold } = body;

  if (!action || !resource) {
    return NextResponse.json(
      { error: 'Missing required fields: action, resource' },
      { status: 400 }
    );
  }

  try {
    const result = await FirewallService.evaluate(tenantId, {
      agent_id: agentId,
      action,
      resource,
      tool_name,
      description,
      domain,
      metadata,
      risk_threshold,
    });

    // Auto-create incident for high-risk blocks (fire-and-forget)
    if (result.verdict === 'block' && result.risk_score >= 90) {
      const isMoralViolation = result.checks.some(c => c.check === 's8_moral' && !c.passed);
      IncidentAutoDetector.fromFirewallBlock({
        tenant_id: tenantId,
        agent_id: agentId,
        firewall_eval_id: result.evaluation_id,
        action: action as string,
        resource: resource as string,
        risk_score: result.risk_score / 100,
        block_reason: result.reasons[0],
        is_moral_violation: isMoralViolation,
      }).catch(err => console.error('[Firewall] IncidentAutoDetector error:', err));
    }

    // Return 200 for allow/escalate, 403 for block so SDKs can check status code
    const status = result.verdict === 'block' ? 403 : 200;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[Firewall] Evaluation error:', error);
    return NextResponse.json(
      { error: 'Firewall evaluation failed', detail: error.message },
      { status: 500 }
    );
  }
}
