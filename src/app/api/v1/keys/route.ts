import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, created_at, last_used_at, is_active')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  try {
    const { name } = await request.json();
    const rawKey = `tl_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: tenantId,
        name: name || 'New API Key',
        key_hash: keyHash,
        scopes: ['read', 'write']
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      id: data.id, 
      key: rawKey, // ONLY RETURNED ONCE
      name: name || 'New API Key'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Key ID missing' }, { status: 400 });

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
