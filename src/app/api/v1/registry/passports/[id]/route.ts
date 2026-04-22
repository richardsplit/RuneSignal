import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * GET    /api/v1/registry/passports/:id           — get passport details
 * POST   /api/v1/registry/passports/:id/verify    — handled in ./verify/route.ts
 * POST   /api/v1/registry/passports/:id/revoke    — handled in ./revoke/route.ts
 * GET    /api/v1/registry/passports/:id/reputation — handled in ./reputation/route.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = await resolveTenantId(request);

  const supabase = createAdminClient();

  // Allow fetching public passports without auth
  const { data, error } = await supabase
    .from('agent_passports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'Passport not found' }, { status: 404 });

  // Non-public passports require tenant match
  if (!data.public && data.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json({ passport: data });
}
