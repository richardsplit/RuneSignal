import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ approval_id: string }> }
) {
  try {
    const { approval_id } = await params;
    const supabase = createAdminClient();

    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
      .single()
      .catch(() => ({ data: null }));

    const tenantId = keyData?.tenant_id || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('hitl_exceptions')
      .select('*')
      .eq('id', approval_id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    const mapStatus = (s: string) => s === 'open' ? 'pending' : s === 'escalated' ? 'escalated' : s;

    return NextResponse.json({
      approval_id: data.id,
      agent_id: data.agent_id,
      action_type: (data.context_data as any)?.action_type || data.title,
      action_description: data.description,
      blast_radius: (data.context_data as any)?.blast_radius || 'medium',
      reversible: (data.context_data as any)?.reversible ?? true,
      status: mapStatus(data.status),
      decision: data.status === 'approved' ? 'approved' : data.status === 'rejected' ? 'rejected' : null,
      decided_by: data.resolver_id ? { user_id: data.resolver_id, name: data.resolver_id } : null,
      decided_at: data.resolved_at || null,
      reviewer_note: data.resolution_reason || null,
      created_at: data.created_at,
      expires_at: data.sla_deadline,
      ledger_entry_id: data.id, // S3 record
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
