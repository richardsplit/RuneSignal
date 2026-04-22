import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * GET  /api/v1/evidence/packs/:id          — retrieve a single pack
 * POST /api/v1/evidence/packs/:id/export   — handled in ./export/route.ts
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('evidence_packs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  return NextResponse.json({ pack: data });
}
