import { NextResponse } from 'next/server';
import { IdentityService } from '../../../../../lib/modules/s6-identity/service';

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const body = await request.json();
    const result = await IdentityService.registerAgent(tenantId, body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Agent Registration Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const { createAdminClient } = require('../../../../../lib/db/supabase');
    const supabase = createAdminClient();

    let query = supabase
      .from('agent_credentials')
      .select('*, permission_scopes(*)')
      .eq('tenant_id', tenantId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ agents: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
