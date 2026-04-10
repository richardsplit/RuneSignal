import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, events = ['approval.decided', 'approval.expired'] } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const supabase = createAdminClient();

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', Buffer.from(apiKey).toString('base64'))
      .single()
      .catch(() => ({ data: null }));

    const tenantId = keyData?.tenant_id || req.headers.get('x-tenant-id') || 'demo-tenant';

    // Store in integration_channels as a webhook provider
    const webhookId = uuidv4();
    await supabase
      .from('integration_channels')
      .insert({
        id: webhookId,
        tenant_id: tenantId,
        provider: 'webhook',
        config: { url, events, type: 'hitl_approval' },
        is_active: true,
      })
      .catch(e => console.error('[hitl/webhooks] insert error:', e));

    return NextResponse.json({
      webhook_id: webhookId,
      url,
      events,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
