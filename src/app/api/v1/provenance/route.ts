import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/db/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action'); // e.g., 'model-versions' or 'query'
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
  }

  const supabase = createAdminClient();

  if (action === 'model-versions') {
    // Return unique model versions detected for this tenant
    const { data, error } = await supabase
      .from('audit_events')
      .select('payload->model, payload->model_version, created_at')
      .eq('tenant_id', tenantId)
      .in('event_type', ['provenance.certificate', 'S3_CERTIFICATE'])
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Query failed' }, { status: 500 });

    // Deduplicate
    const versionsMap = new Map();
    data.forEach(item => {
      const model = item.model;
      const ver = item.model_version;
      const key = `${model}:${ver}`;
      if (!versionsMap.has(key)) {
        versionsMap.set(key, { model, version: ver, last_seen: item.created_at });
      }
    });

    return NextResponse.json({ versions: Array.from(versionsMap.values()) });
  }

  // Default: Audit Query (list certificates)
  const limit = parseInt(searchParams.get('limit') || '50');
  const agentId = searchParams.get('agent_id');

  let query = supabase
    .from('audit_events')
    .select('request_id, event_type, agent_id, payload, created_at')
    .eq('tenant_id', tenantId)
    .in('event_type', ['provenance.certificate', 'S3_CERTIFICATE'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query;
  
  if (error) return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  
  return NextResponse.json({ data });
}
