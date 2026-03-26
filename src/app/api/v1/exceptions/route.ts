import { NextResponse } from 'next/server';
import { HitlService } from '../../../../../lib/modules/s7-hitl/service';
import { createAdminClient } from '../../../../../lib/db/supabase';

// GET all open exceptions for the dashboard
export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('hitl_exceptions')
      .select('*, agent_credentials(agent_name)')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('priority', { ascending: false }) // Hackish: strict alphabetical ordering isn't perfect for enum but works for MVP
      .order('sla_deadline', { ascending: true })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ exceptions: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Agent requests a new HITL exception
export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    const agentId = request.headers.get('X-Agent-Id');

    if (!tenantId || !agentId) {
      return NextResponse.json({ error: 'Missing Authentication' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await HitlService.createException(tenantId, agentId, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Human resolves an exception
export async function PUT(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Authentication' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.ticket_id || !body.action || !body.reason) {
      return NextResponse.json({ error: 'Missing required fields (ticket_id, action, reason)' }, { status: 400 });
    }

    // Usually, we extract user_id from human JWT here.
    const reviewerId = body.reviewer_id || 'system';

    const result = await HitlService.resolveException(tenantId, body.ticket_id, {
      action: body.action,
      reason: body.reason,
      reviewer_id: reviewerId
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
