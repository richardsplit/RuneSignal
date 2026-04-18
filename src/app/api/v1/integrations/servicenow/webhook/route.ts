import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { HitlService } from '../../../../../../../lib/modules/s7-hitl/service';

/**
 * POST /api/v1/integrations/servicenow/webhook
 *
 * Receives ServiceNow business rule webhooks when an incident state changes.
 * Configure via ServiceNow Business Rules → REST Message integration.
 *
 * Expected payload:
 * { sys_id, number, state, resolved_by, close_notes, u_runesignal_ticket_id }
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sys_id, state, resolved_by, close_notes, u_runesignal_ticket_id } = body;

  if (!u_runesignal_ticket_id) {
    return NextResponse.json({ message: 'No RuneSignal ticket ID — ignoring' });
  }

  // ServiceNow incident states: 1=New, 2=In Progress, 6=Resolved, 7=Closed, 8=Cancelled
  const resolvedStates = ['6', '7', 'resolved', 'closed'];
  const cancelledStates = ['8', 'cancelled'];

  const isResolved = resolvedStates.some(s => String(state).toLowerCase() === s);
  const isCancelled = cancelledStates.some(s => String(state).toLowerCase() === s);

  if (!isResolved && !isCancelled) {
    return NextResponse.json({ message: `State "${state}" — no action taken` });
  }

  // Find open HITL ticket
  const supabase = createAdminClient();
  const { data: tickets } = await supabase
    .from('hitl_exceptions')
    .select('id, tenant_id, status')
    .eq('id', u_runesignal_ticket_id)
    .eq('status', 'open')
    .limit(1);

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ message: 'HITL ticket not found or already resolved' });
  }

  const ticket = tickets[0];
  const reviewer = resolved_by || 'servicenow-user';

  try {
    await HitlService.resolveException(ticket.tenant_id, ticket.id, {
      action: isCancelled ? 'reject' : 'approve',
      reviewer_id: `servicenow:${reviewer}`,
      reason: close_notes || `${isCancelled ? 'Cancelled' : 'Resolved'} via ServiceNow (state: ${state})`,
    });

    return NextResponse.json({
      message: `HITL ticket ${ticket.id} ${isCancelled ? 'rejected' : 'approved'} from ServiceNow`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
