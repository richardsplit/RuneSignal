import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';

/**
 * GET /api/v1/a2a/graph
 * Returns the A2A session graph (nodes = agents, edges = sessions).
 * Suitable for D3 force diagram rendering.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createAdminClient();
  const { data: sessions, error } = await supabase
    .from('a2a_sessions')
    .select('id, initiator_id, target_id, status, verdict, message_count, created_at, task_description')
    .eq('tenant_id', tenantId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build graph: nodes (unique agent IDs) + edges (sessions)
  const agentIds = new Set<string>();
  (sessions || []).forEach(s => {
    agentIds.add(s.initiator_id);
    agentIds.add(s.target_id);
  });

  const nodes = Array.from(agentIds).map(id => ({ id, type: 'agent' }));
  const edges = (sessions || []).map(s => ({
    id: s.id,
    source: s.initiator_id,
    target: s.target_id,
    status: s.status,
    verdict: s.verdict,
    message_count: s.message_count,
    created_at: s.created_at,
    task_description: s.task_description,
  }));

  return NextResponse.json({ nodes, edges, session_count: edges.length, agent_count: nodes.length });
}
