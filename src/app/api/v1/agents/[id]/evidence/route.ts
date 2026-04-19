/**
 * GET /api/v1/agents/{id}/evidence — Agent evidence contribution
 *
 * Returns compliance reports (evidence bundles) that reference this agent.
 *
 * EU AI Act Article 13 — Transparency & Traceability
 * ISO 42001 Clause 8.5 — Human Oversight Logs
 *
 * Phase 5 Task 5.1.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentBehaviorService } from '@lib/services/agent-behavior-service';
import { resolveTenantId } from '@lib/api/resolve-tenant';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const { id: agentId } = await params;

    const evidenceBundles = await AgentBehaviorService.getAgentEvidenceContribution(
      tenantId,
      agentId,
    );

    return NextResponse.json({
      agent_id: agentId,
      evidence_bundles: evidenceBundles,
    });
  } catch (err) {
    console.error('[agents/evidence GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
