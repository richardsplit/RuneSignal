import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { SovereignEncryption } from '../../../../../../lib/modules/s10-sovereign/encryption';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { data: config } = await supabase.from('sovereign_sync_configs')
      .select('id, destination_type, destination_uri, sync_frequency, is_active, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .single();
    
    return NextResponse.json({ config: config || null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { destination_type, destination_uri, credentials, sync_frequency, is_active } = body;

    if (!['s3', 'snowflake'].includes(destination_type)) {
       return NextResponse.json({ error: 'Invalid destination_type' }, { status: 400 });
    }

    const credentials_encrypted = SovereignEncryption.encrypt(JSON.stringify(credentials));

    const supabase = createAdminClient();
    const { data: config, error } = await supabase.from('sovereign_sync_configs').upsert({
      tenant_id: tenantId,
      destination_type,
      destination_uri,
      credentials_encrypted,
      sync_frequency: sync_frequency || 'daily',
      is_active: is_active ?? true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' }).select('id, destination_type, destination_uri, sync_frequency, is_active').single();

    if (error) throw error;

    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
