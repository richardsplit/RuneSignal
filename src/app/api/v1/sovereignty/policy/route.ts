import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/sovereignty/policy
 * Retrieve the tenant's current data residency policy.
 *
 * PUT /api/v1/sovereignty/policy
 * Upsert the tenant's data residency policy.
 * Body: { allowed_regions, blocked_providers?, data_classifications?, auto_reroute?, block_on_violation? }
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  const { data: policy, error } = await supabase
    .from('data_residency_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ policy: policy || null });
}

export async function PUT(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    allowed_regions?: string[];
    blocked_providers?: string[];
    data_classifications?: string[];
    auto_reroute?: boolean;
    block_on_violation?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.allowed_regions || body.allowed_regions.length === 0) {
    return NextResponse.json({ error: 'allowed_regions is required and must not be empty' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('data_residency_policies')
    .upsert(
      {
        tenant_id: tenantId,
        allowed_regions: body.allowed_regions,
        blocked_providers: body.blocked_providers || [],
        data_classifications: body.data_classifications || ['PII', 'PHI', 'CONFIDENTIAL'],
        auto_reroute: body.auto_reroute ?? false,
        block_on_violation: body.block_on_violation ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ policy: data });
}
