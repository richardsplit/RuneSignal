import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/policies/packs
 * Lists all available policy packs and installation status for the tenant.
 *
 * POST /api/v1/policies/packs
 * Installs a policy pack for the tenant.
 * Body: { pack_id: string }
 *
 * DELETE /api/v1/policies/packs?pack_id=uuid
 * Deactivates an installed policy pack.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();

  // Fetch all packs + tenant installation status in parallel
  const [{ data: packs, error: packErr }, { data: installed, error: instErr }] = await Promise.all([
    supabase.from('policy_packs').select('*').eq('is_active', true).order('category'),
    supabase
      .from('tenant_policy_packs')
      .select('pack_id, is_active, installed_at, installed_by')
      .eq('tenant_id', tenantId),
  ]);

  if (packErr) return NextResponse.json({ error: packErr.message }, { status: 500 });
  if (instErr) return NextResponse.json({ error: instErr.message }, { status: 500 });

  const installedMap = new Map(
    (installed || []).map(r => [r.pack_id, r])
  );

  const result = (packs || []).map(pack => ({
    ...pack,
    installed: installedMap.has(pack.id) && installedMap.get(pack.id)!.is_active,
    installed_at: installedMap.get(pack.id)?.installed_at ?? null,
    installed_by: installedMap.get(pack.id)?.installed_by ?? null,
  }));

  return NextResponse.json({ packs: result });
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: { pack_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { pack_id } = body;
  if (!pack_id) return NextResponse.json({ error: 'Missing pack_id' }, { status: 400 });

  const supabase = createAdminClient();

  // Verify pack exists and is active
  const { data: pack, error: packErr } = await supabase
    .from('policy_packs')
    .select('id, name, tier_required, policies')
    .eq('id', pack_id)
    .eq('is_active', true)
    .single();

  if (packErr || !pack) {
    return NextResponse.json({ error: 'Policy pack not found' }, { status: 404 });
  }

  // Upsert: if already installed, reactivate
  const { data, error } = await supabase
    .from('tenant_policy_packs')
    .upsert(
      {
        tenant_id: tenantId,
        pack_id,
        is_active: true,
        installed_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,pack_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      message: `Policy pack "${pack.name}" installed successfully`,
      installation: data,
      policies_loaded: Array.isArray(pack.policies) ? pack.policies.length : 0,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pack_id = searchParams.get('pack_id');
  if (!pack_id) return NextResponse.json({ error: 'Missing pack_id query parameter' }, { status: 400 });

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('tenant_policy_packs')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('pack_id', pack_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Policy pack deactivated' });
}
