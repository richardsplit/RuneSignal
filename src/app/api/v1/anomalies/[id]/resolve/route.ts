import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * POST /api/v1/anomalies/[id]/resolve
 * Resolve a behavioral anomaly.
 * Body: { resolution_note, resolved_by }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: { resolution_note?: string; resolved_by?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('anomaly_events')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: body.resolved_by || 'unknown',
      resolution_note: body.resolution_note || '',
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 });

  return NextResponse.json({ anomaly: data });
}
