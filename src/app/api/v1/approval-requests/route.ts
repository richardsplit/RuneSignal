/**
 * POST /api/v1/approval-requests — Create a new approval request
 * GET  /api/v1/approval-requests — List approval requests
 *
 * Public-facing approval gateway for external AI workflows.
 * Facade over HitlService — translates the new API contract into existing service calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { HitlService } from '@lib/modules/s7-hitl/service';
import { IntegrationDispatcher } from '@lib/integrations/dispatcher';
import { computeBlastRadius, BlastRadiusInput } from '@lib/hitl/blastRadiusScorer';
import { ActionCategory, ACTION_REGULATION_MAP } from '@lib/types/approval';
import { AuditLedgerService } from '@lib/ledger/service';
import type { IntegrationProvider } from '@lib/integrations/types';
import crypto from 'crypto';

const VALID_CATEGORIES: ActionCategory[] = [
  'financial', 'pii', 'deploy', 'comms', 'infrastructure', 'data_deletion', 'model_update',
];

/**
 * Resolve tenant ID from API key or X-Tenant-Id header.
 */
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Resolve tenant
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    // 2. Validate required fields
    if (!body.agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }
    if (!body.action?.category || !VALID_CATEGORIES.includes(body.action.category)) {
      return NextResponse.json(
        { error: `action.category is required and must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!body.action?.description) {
      return NextResponse.json({ error: 'action.description is required' }, { status: 400 });
    }

    // 3. Compute blast radius
    const blastInput: BlastRadiusInput = {
      action_type: body.action.category,
      affects_external_systems: ['deploy', 'comms', 'infrastructure'].includes(body.action.category),
      reversible: !['data_deletion', 'financial'].includes(body.action.category),
      data_classification: ['pii', 'data_deletion'].includes(body.action.category) ? 'restricted' : 'internal',
    };
    const blastRadius = computeBlastRadius(blastInput);

    // 4. Determine regulation refs
    const regulationRefs: string[] = body.regulation_refs?.length
      ? body.regulation_refs
      : ACTION_REGULATION_MAP[body.action.category as ActionCategory] || [];

    // 4b. Policy-based auto-approve (ENABLE_AUTO_APPROVE=true + low blast-radius comms)
    const autoApproveEnabled = process.env.ENABLE_AUTO_APPROVE === 'true';
    if (autoApproveEnabled && blastRadius.level === 'low' && body.action.category === 'comms') {
      const ticket = await HitlService.createException(tenantId, body.agent_id, {
        title: `[${body.action.category.toUpperCase()}] ${body.action.description}`,
        description: body.action.description,
        priority: 'low',
        context_data: {
          ...body.context_data,
          action_category: body.action.category,
          tool_name: body.action.tool_name,
          resource: body.action.resource,
          regulation_refs: regulationRefs,
          blast_radius: blastRadius,
          sla_auto_action: 'approve',
        },
      });
      await HitlService.resolveException(tenantId, ticket.id, {
        action: 'approve',
        reason: 'Auto-approved: low blast-radius comms action (policy engine)',
        reviewer_id: 'system:auto_approve',
      });
      AuditLedgerService.appendEvent({
        event_type: 'hitl_auto_approved',
        module: 's7',
        tenant_id: tenantId,
        agent_id: body.agent_id,
        payload: { approval_id: ticket.id, blast_radius: blastRadius, category: body.action.category },
      }).catch(() => {});
      return NextResponse.json({
        id: ticket.id,
        status: 'auto_approved',
        blast_radius: blastRadius,
        sla: { deadline: null, auto_action: 'approve' },
        regulation_refs: regulationRefs,
        channels_notified: [],
      }, { status: 201 });
    }

    // 5. Delegate to HitlService.createException()
    const ticket = await HitlService.createException(tenantId, body.agent_id, {
      title: `[${body.action.category.toUpperCase()}] ${body.action.description}`,
      description: body.action.description,
      priority: blastRadius.level,
      context_data: {
        ...body.context_data,
        action_category: body.action.category,
        tool_name: body.action.tool_name,
        resource: body.action.resource,
        regulation_refs: regulationRefs,
        blast_radius: blastRadius,
        sla_auto_action: body.sla?.auto_action || 'escalate',
        routing_channels: body.routing?.channels,
      },
    });

    // 6. Dispatch to channels with optional channelFilter
    const channelFilter = body.routing?.channels as IntegrationProvider[] | undefined;
    let channelsNotified: string[] = [];

    try {
      const dispatchResults = await IntegrationDispatcher.dispatchHitlCreated(
        tenantId,
        {
          id: ticket.id,
          tenant_id: tenantId,
          agent_id: body.agent_id,
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          status: 'open',
          context_data: ticket.context_data || {},
          sla_deadline: ticket.sla_deadline || '',
          created_at: ticket.created_at,
        },
        channelFilter,
      );
      channelsNotified = dispatchResults
        .filter(r => r.success)
        .map(r => r.provider);
    } catch (e) {
      console.error('[approval-requests] dispatch failed:', e);
    }

    // 7. Return 201
    return NextResponse.json({
      id: ticket.id,
      status: 'pending',
      blast_radius: blastRadius,
      sla: {
        deadline: ticket.sla_deadline,
        auto_action: body.sla?.auto_action || 'escalate',
      },
      regulation_refs: regulationRefs,
      channels_notified: channelsNotified,
    }, { status: 201 });
  } catch (err) {
    console.error('[approval-requests POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createAdminClient();

    // Count total matching records
    let countQuery = supabase
      .from('hitl_exceptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('context_data->action_category', 'is', null);

    if (status) {
      const dbStatus = status === 'pending' ? 'open' : status;
      countQuery = countQuery.eq('status', dbStatus);
    }

    const { count } = await countQuery;

    // Fetch page
    let query = supabase
      .from('hitl_exceptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('context_data->action_category', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      const dbStatus = status === 'pending' ? 'open' : status;
      query = query.eq('status', dbStatus);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map((t: any) => ({
      id: t.id,
      agent_id: t.agent_id,
      status: t.status === 'open' ? 'pending' : t.status,
      action: {
        category: t.context_data?.action_category,
        description: t.description,
        tool_name: t.context_data?.tool_name || null,
        resource: t.context_data?.resource || null,
      },
      blast_radius: t.context_data?.blast_radius || null,
      sla: {
        deadline: t.sla_deadline,
        auto_action: t.context_data?.sla_auto_action || 'escalate',
      },
      regulation_refs: t.context_data?.regulation_refs || [],
      created_at: t.created_at,
      resolved_at: t.resolved_at || null,
    }));

    return NextResponse.json({
      approval_requests: items,
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[approval-requests GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
