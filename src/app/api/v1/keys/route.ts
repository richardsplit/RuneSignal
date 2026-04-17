import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // createServerClient is async — must be awaited or supabase is a Promise, not a client
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, created_at, last_used_at, is_active')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    Sentry.captureException(error, {
      tags: { route: '/api/v1/keys', method: 'GET', component: 'keys' },
      extra: { tenant_id: tenantId },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  try {
    const { name } = await request.json();
    const rawKey = `tl_${crypto.randomBytes(24).toString('hex')}`;
    // SHA-256 hash — matches the middleware key verification algorithm
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
      key: rawKey, // ONLY RETURNED ONCE — never stored in plaintext
      name: name || 'New API Key'
    });
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { route: '/api/v1/keys', method: 'POST', component: 'keys' },
      extra: { tenant_id: tenantId },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Key ID missing' }, { status: 400 });

  // Scope DELETE by both id AND tenant_id — defence in depth alongside RLS
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: '/api/v1/keys', method: 'DELETE', component: 'keys' },
      extra: { tenant_id: tenantId, key_id: id },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
