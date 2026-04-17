/**
 * GET /api/v1/approval-requests/{id}
 *
 * Returns full details for a single approval request, including blast_radius,
 * regulation_refs, and signed receipt info if decided.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import crypto from 'crypto';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  if (apiKey) {
    const supabase = createAdminClient();
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
      .single()
      .catch(() => ({ data: null }));

    if (keyData?.tenant_id) return keyData.tenant_id;
  }

  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('hitl_exceptions')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    const response: Record<string, unknown> = {
      id: data.id,
      agent_id: data.agent_id,
      status: data.status === 'open' ? 'pending' : data.status,
      action: {
        category: data.context_data?.action_category || null,
        description: data.description,
        tool_name: data.context_data?.tool_name || null,
        resource: data.context_data?.resource || null,
      },
      blast_radius: data.context_data?.blast_radius || null,
      sla: {
        deadline: data.sla_deadline,
        auto_action: data.context_data?.sla_auto_action || 'escalate',
      },
      regulation_refs: data.context_data?.regulation_refs || [],
      created_at: data.created_at,
      resolved_at: data.resolved_at || null,
    };

    // Include decision details if resolved
    if (data.status === 'approved' || data.status === 'rejected') {
      response.decision = {
        action: data.status,
        decided_by: data.resolved_by || null,
        reason: data.resolution_reason || null,
        decided_at: data.resolved_at || null,
        receipt_signature: data.receipt_signature || null,
        receipt_event_id: data.receipt_event_id || null,
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('[approval-requests/{id} GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
