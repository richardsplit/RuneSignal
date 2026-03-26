import { NextResponse } from 'next/server';
import { ArbiterService } from '../../../../../lib/modules/s1-conflict/service';

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    const agentId = request.headers.get('X-Agent-Id');

    if (!tenantId || !agentId) {
      return NextResponse.json({ error: 'Missing Authentication' }, { status: 401 });
    }

    const body = await request.json();
    const vendor = request.headers.get('X-Vendor') as 'openai' | 'claude' || body.vendor || 'openai';

    if (!body.intent_description) {
      return NextResponse.json({ error: 'Missing intent_description' }, { status: 400 });
    }

    const result = await ArbiterService.mediateIntent(tenantId, agentId, {
      ...body,
      vendor
    });

    if (result.decision === 'block') {
      return NextResponse.json(result, { status: 403 });
    }
    
    if (result.decision === 'queue') {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Arbiter Intent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const { createAdminClient } = require('../../../../../lib/db/supabase');
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('agent_intents')
      .select('*, agent_credentials(agent_name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ intents: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) return NextResponse.json({ error: 'Missing Authentication' }, { status: 401 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Missing intent ID' }, { status: 400 });

    const result = await ArbiterService.overrideIntent(tenantId, body.id, body.updates || body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) return NextResponse.json({ error: 'Missing Authentication' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing intent ID' }, { status: 400 });

    await ArbiterService.releaseIntent(tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
