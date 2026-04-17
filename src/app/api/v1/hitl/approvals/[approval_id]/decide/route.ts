import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { AuditLedgerService } from '@/lib/ledger/service';
import { WebhookEmitter } from '@/lib/webhooks/emitter';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ approval_id: string }> }
) {
  try {
    const { approval_id } = await params;
    const body = await req.json();
    const { decision, note } = body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be "approved" or "rejected"' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('hitl_exceptions')
      .select('status, agent_id, title')
      .eq('id', approval_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    if (existing.status !== 'open' && existing.status !== 'escalated') {
      return NextResponse.json({ error: `Approval is already ${existing.status}` }, { status: 409 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('hitl_exceptions')
      .update({
        status: decision,
        resolver_id: req.headers.get('x-user-id') || 'api-reviewer',
        resolution_reason: note || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', approval_id)
      .select()
      .single();

    if (updateError) throw updateError;

    await AuditLedgerService.appendEvent({
      event_type: 'hitl.approval_decided',
      module: 's7',
      tenant_id: tenantId,
      agent_id: existing.agent_id,
      request_id: approval_id,
      payload: { decision, note, reviewer: req.headers.get('x-user-id') },
    }).catch(() => {});

    await WebhookEmitter.notifyTenant(
      tenantId,
      `HITL ${decision.toUpperCase()}: ${existing.title}`,
      { approval_id, decision, note }
    ).catch(() => {});

    return NextResponse.json({
      approval_id,
      status: decision,
      decided_at: updated.resolved_at,
      ledger_entry_id: approval_id,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
