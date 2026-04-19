/**
 * GET /api/v1/agents/{id}/behavior — Agent behavior timeline
 *
 * Returns merged timeline of all events for an agent across audit_events,
 * firewall_evaluations, hitl_exceptions, anomaly_events, and incidents.
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

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await AgentBehaviorService.getAgentTimeline(tenantId, agentId, {
      start,
      end,
      limit,
      offset,
    });

    return NextResponse.json({
      agent: result.agent,
      events: result.events,
      summary: result.summary,
      limit,
      offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (message === 'Agent not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[agents/behavior GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
