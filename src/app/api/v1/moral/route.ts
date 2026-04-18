import { NextRequest, NextResponse } from 'next/server';
import { ConscienceEngine } from '../../../../../lib/modules/s8-moralos/conscience';
import { SoulService } from '../../../../../lib/modules/s8-moralos/soul';
import { createAdminClient } from '@lib/db/supabase';

/**
 * POST /api/v1/moral
 * Evaluate an agent action against the Corporate SOUL.
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const agentId = request.headers.get('X-Agent-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();

    if (!agentId) return NextResponse.json({ error: 'Missing X-Agent-Id for evaluation' }, { status: 400 });
    if (!body.action_description) {
      return NextResponse.json({ error: 'Missing action_description' }, { status: 400 });
    }

    if (!body.domain || body.domain === 'auto') {
      const supabase = createAdminClient();
      const { data: agent } = await supabase
        .from('agent_credentials')
        .select('agent_type')
        .eq('id', agentId)
        .single();
        
      const ROBO_DOMAIN_MAP: Record<string, string> = {
          'robot_arm': 'physical',
          'drone': 'physical',
          'surgical_robot': 'physical',
          'vehicle': 'physical',
          'finance': 'finance',
          'orchestrator': 'core',
      };
      body.domain = ROBO_DOMAIN_MAP[agent?.agent_type || ''] || 'ops';
    }

    const verdict = await ConscienceEngine.evaluate(tenantId, {
      agent_id: agentId,
      action_description: body.action_description,
      domain: body.domain,
      action_metadata: body.action_metadata || {}
    });

    if (verdict.verdict === 'block') {
      return NextResponse.json(verdict, { status: 403 });
    }

    return NextResponse.json(verdict);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/v1/moral
 * Returns active SOUL or paginated moral events.
 * ?type=soul -> active SOUL
 * ?type=events&domain=finance&verdict=pause&limit=50&offset=0 -> events
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'soul';

  try {
    if (type === 'soul') {
      const result = await SoulService.getActiveSoul(tenantId);
      return NextResponse.json({
        soul: result.soul,
        version: result.version,
        signed_by: result.profile.signed_by,
        signature: result.profile.signature,
        created_at: result.profile.created_at
      });
    }

    if (type === 'events') {
      const supabase = createAdminClient();
      const domain = searchParams.get('domain');
      const verdict = searchParams.get('verdict');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      let query = supabase
        .from('moral_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (domain) query = query.eq('domain', domain);
      if (verdict) query = query.eq('verdict', verdict);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === 'history') {
      const history = await SoulService.getSoulHistory(tenantId);
      return NextResponse.json(history);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
