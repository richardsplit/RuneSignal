import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * SDK Auto-Registration endpoint.
 * Called automatically on first use of @runesignal/sdk.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, name, framework, platform, model, metadata = {} } = body;

    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const supabase = createAdminClient();

    let keyData: { tenant_id: string } | null = null;
    try {
      const { data } = await supabase
        .from('api_keys')
        .select('tenant_id')
        .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
        .single();
      keyData = data;
    } catch { /* invalid key */ }

    const tenantId = keyData?.tenant_id || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    // Upsert: update last_active_at if exists, insert if new
    let existing: { data: { id: string } | null } = { data: null };
    try {
      const { data } = await supabase
        .from('agent_inventory')
        .select('id')
        .eq('org_id', tenantId)
        .eq('name', agent_id || name)
        .single();
      existing = { data };
    } catch { /* not found — proceed to insert */ }

    if ((existing as any).data?.id) {
      await supabase
        .from('agent_inventory')
        .update({ last_active_at: new Date().toISOString(), metadata })
        .eq('id', (existing as any).data.id);

      return NextResponse.json({ registered: false, updated: true, agent_id: (existing as any).data.id });
    }

    const { data, error } = await supabase
      .from('agent_inventory')
      .insert({
        id: uuidv4(),
        org_id: tenantId,
        name: name || agent_id || 'unnamed-agent',
        framework: framework || 'unknown',
        platform: platform || 'custom',
        model,
        status: 'active',
        risk_classification: 'unclassified',
        discovery_method: 'sdk',
        is_sanctioned: false,
        eu_ai_act_category: 'unclassified',
        metadata,
        last_active_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[agents/inventory/register] error:', error);
      return NextResponse.json({ registered: false, error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ registered: true, agent_id: data.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
