import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const framework = searchParams.get('framework');
    const platform = searchParams.get('platform');
    const risk_classification = searchParams.get('risk_classification');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createAdminClient();
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    let query = supabase
      .from('agent_inventory')
      .select('*')
      .eq('org_id', tenantId)
      .order('first_seen_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (framework) query = query.eq('framework', framework);
    if (platform) query = query.eq('platform', platform);
    if (risk_classification) query = query.eq('risk_classification', risk_classification);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    // Also get shadow AI count
    const { count: shadowCount } = await supabase
      .from('agent_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', tenantId)
      .eq('is_sanctioned', false)
      .neq('status', 'decommissioned');

    return NextResponse.json({
      agents: data || [],
      total: count || data?.length || 0,
      shadow_ai_count: shadowCount || 0,
      limit,
      offset,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      framework = 'unknown',
      platform = 'custom',
      model,
      status = 'active',
      risk_classification = 'unclassified',
      is_sanctioned = false,
      eu_ai_act_category = 'unclassified',
      metadata = {},
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('agent_inventory')
      .insert({
        id: uuidv4(),
        org_id: tenantId,
        name,
        description,
        framework,
        platform,
        model,
        status,
        risk_classification,
        discovery_method: 'manual',
        is_sanctioned,
        eu_ai_act_category,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
