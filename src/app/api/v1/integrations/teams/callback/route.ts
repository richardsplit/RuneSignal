import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../../lib/db/supabase';
import { HitlService } from '../../../../../../../lib/modules/s7-hitl/service';

/**
 * POST /api/v1/integrations/teams/callback
 *
 * Receives Microsoft Teams Adaptive Card action callbacks.
 * Called when a reviewer clicks "Approve" or "Reject" on a Teams card.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ticket_id: ticketId, action, reviewer } = body;

  if (!ticketId || !action) {
    return NextResponse.json({ error: 'Missing ticket_id or action' }, { status: 400 });
  }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject".' }, { status: 400 });
  }

  // Look up ticket to get tenant context
  const supabase = createAdminClient();
  const { data: ticket, error } = await supabase
    .from('hitl_exceptions')
    .select('tenant_id, status')
    .eq('id', ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  if (ticket.status !== 'open') {
    return NextResponse.json({
      type: 'message',
      text: `⚠️ Ticket already ${ticket.status}.`,
    });
  }

  try {
    await HitlService.resolveException(ticket.tenant_id, ticketId, {
      action: action as 'approve' | 'reject',
      reviewer_id: `teams:${reviewer || 'teams-user'}`,
      reason: `${action === 'approve' ? 'Approved' : 'Rejected'} via Microsoft Teams`,
    });

    return NextResponse.json({
      type: 'message',
      text: `${action === 'approve' ? '✅ Approved' : '❌ Rejected'} — RuneSignal audit ledger updated.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
