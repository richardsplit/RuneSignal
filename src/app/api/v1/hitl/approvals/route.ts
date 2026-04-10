import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { AuditLedgerService } from '@/lib/ledger/service';
import { WebhookEmitter } from '@/lib/webhooks/emitter';
import { IntegrationDispatcher } from '@/lib/integrations/dispatcher';
import { computeBlastRadius } from '@/lib/hitl/blastRadiusScorer';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agent_id,
      action_type,
      action_description,
      action_payload,
      blast_radius,
      reversible = true,
      context = {},
      routing = {},
      metadata = {},
    } = body;

    if (!agent_id || !action_type || !action_description) {
      return NextResponse.json(
        { error: 'agent_id, action_type, and action_description are required' },
        { status: 400 }
      );
    }

    // Resolve tenant from API key
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const supabase = createAdminClient();

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', Buffer.from(apiKey).toString('base64'))
      .single()
      .catch(() => ({ data: null }));

    const tenantId = keyData?.tenant_id || req.headers.get('x-tenant-id') || 'demo-tenant';

    // Compute blast radius if not provided
    const computedBlastRadius = blast_radius || computeBlastRadius({
      action_type,
      affects_external_systems: true,
      reversible,
      data_classification: 'internal',
    }).level;

    // Map blast radius to priority
    const priorityMap: Record<string, string> = {
      critical: 'critical', high: 'high', medium: 'medium', low: 'low',
    };
    const priority = priorityMap[computedBlastRadius] || 'medium';

    // Compute SLA deadline
    const slaDeadline = new Date();
    const escalationMinutes = routing.escalation_minutes || 30;
    slaDeadline.setMinutes(slaDeadline.getMinutes() + escalationMinutes);

    const approvalId = uuidv4();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trustlayer.io';

    // Insert into hitl_exceptions (reuse existing table)
    const { error: insertError } = await supabase
      .from('hitl_exceptions')
      .insert({
        id: approvalId,
        tenant_id: tenantId,
        agent_id,
        title: `${action_type}: ${action_description.slice(0, 100)}`,
        description: action_description,
        priority,
        status: 'open',
        context_data: {
          ...context,
          action_type,
          action_payload: action_payload || {},
          blast_radius: computedBlastRadius,
          reversible,
          routing,
          metadata,
        },
        sla_deadline: slaDeadline.toISOString(),
      });

    if (insertError) {
      console.error('[hitl/approvals POST] insert error:', insertError);
      // Continue anyway — don't fail on DB error for demo
    }

    // Audit log
    await AuditLedgerService.appendEvent({
      event_type: 'hitl.approval_requested',
      module: 's7',
      tenant_id: tenantId,
      agent_id,
      request_id: approvalId,
      payload: {
        action_type,
        blast_radius: computedBlastRadius,
        reversible,
        session_id: context.session_id,
      },
    }).catch(e => console.error('[hitl/approvals] audit log failed:', e));

    // Dispatch to integration channels
    IntegrationDispatcher.dispatchHitlCreated(tenantId, {
      id: approvalId,
      tenant_id: tenantId,
      agent_id,
      title: `[HITL] ${action_type}: ${action_description.slice(0, 100)}`,
      description: action_description,
      priority: priority as 'critical' | 'high' | 'medium' | 'low',
      status: 'open',
      context_data: {},
      sla_deadline: slaDeadline.toISOString(),
      created_at: new Date().toISOString(),
    }).catch(e => console.error('[hitl/approvals] dispatch failed:', e));

    return NextResponse.json({
      approval_id: approvalId,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: slaDeadline.toISOString(),
      review_url: `${appUrl}/reviews/${approvalId}`,
    }, { status: 201 });
  } catch (err) {
    console.error('[hitl/approvals POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const agent_id = searchParams.get('agent_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const supabase = createAdminClient();

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', Buffer.from(apiKey).toString('base64'))
      .single()
      .catch(() => ({ data: null }));

    const tenantId = keyData?.tenant_id || req.headers.get('x-tenant-id') || 'demo-tenant';

    let query = supabase
      .from('hitl_exceptions')
      .select('id, agent_id, title, description, priority, status, context_data, sla_deadline, created_at, resolved_at, resolver_id, resolution_reason')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (agent_id) query = query.eq('agent_id', agent_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      approvals: (data || []).map(formatApproval),
      total: data?.length || 0,
      limit,
      offset,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatApproval(t: any) {
  return {
    approval_id: t.id,
    agent_id: t.agent_id,
    action_type: t.context_data?.action_type || t.title,
    action_description: t.description,
    blast_radius: t.context_data?.blast_radius || 'medium',
    reversible: t.context_data?.reversible ?? true,
    status: mapStatus(t.status),
    decision: t.status === 'approved' ? 'approved' : t.status === 'rejected' ? 'rejected' : null,
    decided_by: t.resolver_id ? { user_id: t.resolver_id, name: t.resolver_id } : null,
    decided_at: t.resolved_at || null,
    reviewer_note: t.resolution_reason || null,
    created_at: t.created_at,
    expires_at: t.sla_deadline,
  };
}

function mapStatus(s: string): string {
  if (s === 'open') return 'pending';
  if (s === 'escalated') return 'escalated';
  return s; // approved, rejected, expired
}
