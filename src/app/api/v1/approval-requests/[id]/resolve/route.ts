/**
 * POST /api/v1/approval-requests/{id}/resolve
 *
 * Approve or reject an approval request.
 * Delegates to HitlService.resolveException() which creates a signed receipt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { HitlService } from '@lib/modules/s7-hitl/service';
import { resolveTenantId } from '@lib/api/resolve-tenant';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'action is required and must be "approve" or "reject"' },
        { status: 400 },
      );
    }
    if (!body.reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    // 3. Get reviewer identity from x-user-id header
    const reviewerId = req.headers.get('x-user-id');
    if (!reviewerId) {
      return NextResponse.json(
        { error: 'x-user-id header is required to identify the reviewer' },
        { status: 400 },
      );
    }

    // 4. Delegate to HitlService.resolveException()
    const ticket = await HitlService.resolveException(tenantId, id, {
      action: body.action,
      reason: body.reason,
      reviewer_id: reviewerId,
    });

    // 5. Return response with signed receipt
    return NextResponse.json({
      id: ticket.id,
      status: ticket.status as 'approved' | 'rejected',
      decision: {
        decided_by: reviewerId,
        reason: body.reason,
        decided_at: ticket.resolved_at || new Date().toISOString(),
        receipt_signature: ticket.receipt_signature || null,
        receipt_event_id: ticket.receipt_event_id || null,
      },
    });
  } catch (err: any) {
    // Handle known errors from HitlService
    if (err?.message === 'Exception ticket not found') {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }
    if (err?.message?.startsWith('Ticket is already')) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    console.error('[approval-requests/{id}/resolve POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
