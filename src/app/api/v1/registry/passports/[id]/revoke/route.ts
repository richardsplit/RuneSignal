import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * POST /api/v1/registry/passports/:id/revoke
 * Revoke an agent passport. Only the issuing tenant can revoke.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { reason?: string } = {};
  try { body = await request.json(); } catch { /* reason optional */ }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('agent_passports')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revocation_reason: body.reason ?? 'Manually revoked', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Passport not found or not owned by this tenant' }, { status: 404 });

  return NextResponse.json({ passport: data });
}
