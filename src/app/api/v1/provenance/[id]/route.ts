import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('request_id', params.id)
    .eq('event_type', 'provenance.certificate')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  return NextResponse.json({ certificate: data });
}
