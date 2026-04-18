import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * POST /api/v1/onboarding/set-admin-role
 *
 * Called server-side immediately after tenant creation.
 * Sets app_metadata.role = 'admin' on the creating user via the service-role
 * Supabase admin client (browser cannot call updateUserById directly).
 *
 * Auth: requires valid X-Tenant-Id set by middleware (user must be authenticated).
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });
  }

  let body: { user_id: string; tenant_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.user_id || !body.tenant_id) {
    return NextResponse.json({ error: 'user_id and tenant_id are required' }, { status: 400 });
  }

  // Verify the user_id actually owns this tenant (prevent privilege escalation)
  const supabase = createAdminClient();
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', body.tenant_id)
    .eq('user_id', body.user_id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'User is not the tenant owner' }, { status: 403 });
  }

  // Set app_metadata.role = 'admin' using service-role admin client
  const { error } = await supabase.auth.admin.updateUserById(body.user_id, {
    app_metadata: { role: 'admin', tenant_id: body.tenant_id },
  });

  if (error) {
    console.error('[set-admin-role] Failed to update user metadata:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
