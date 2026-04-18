import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@lib/db/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/onboarding/create-tenant
 * Creates a new tenant and links the authenticated user as owner.
 * Uses service-role admin client to bypass RLS on the tenants table.
 * Body: { company_name: string }
 */
export async function POST(request: NextRequest) {
  let body: { company_name: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.company_name?.trim()) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 });
  }

  // Verify the caller is authenticated via their session cookie
  const serverClient = await createServerClient();
  const { data: { user }, error: authError } = await serverClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Use admin client (service-role) to bypass RLS for tenant creation
  const admin = createAdminClient();

  // 1. Create tenant
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name: body.company_name.trim(), owner_id: user.id })
    .select()
    .single();

  if (tenantError) {
    console.error('[create-tenant] tenant insert error:', tenantError.message);
    return NextResponse.json({ error: tenantError.message }, { status: 500 });
  }

  // 2. Link user as owner in tenant_members
  const { error: memberError } = await admin
    .from('tenant_members')
    .insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' });

  if (memberError) {
    console.error('[create-tenant] member insert error:', memberError.message);
    // Non-fatal — tenant was created; clean up gracefully
    await admin.from('tenants').delete().eq('id', tenant.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // 3. Stamp admin role in JWT app_metadata
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: 'admin', tenant_id: tenant.id },
  });

  if (metaError) {
    console.warn('[create-tenant] Could not set app_metadata:', metaError.message);
  }

  return NextResponse.json({ tenant_id: tenant.id, name: tenant.name });
}
