import { AuditLedgerService } from '../../ledger/service';
import { WebhookEmitter } from '../../webhooks/emitter';
import { ExceptionTicket } from '../s7-hitl/types';
import { MoralVerdict } from './types';
import { createAdminClient } from '../../db/supabase';
import { v4 as uuidv4 } from 'uuid';

export class MoralOOBService {
  /**
   * Sends enhanced Slack notification for moral conflicts.
   * Thin adapter over existing S7 WebhookEmitter.
   */
  static async requestMoralApproval(ticket: any, verdict: MoralVerdict): Promise<void> {
    await WebhookEmitter.notifyTenant(
      ticket.tenant_id,
      `🧠 [MORAL CONFLICT] ${verdict.conflict_reason || 'Action requires moral review'}`,
      {
        Domain: verdict.domain,
        Verdict: verdict.verdict,
        'Escalate To': verdict.escalate_to || 'manager',
        'SOUL Version': verdict.soul_version,
        'Ticket ID': ticket.id,
        Priority: ticket.priority
      }
    );
  }

  /**
   * Resolves a moral event after S7 ticket approval/rejection.
   * Call this from the S7 exception resolve flow when the ticket has moral context.
   */
  static async resolveMoralEvent(tenantId: string, oobTicketId: string, action: 'approve' | 'reject', reviewerId: string): Promise<void> {
    const supabase = createAdminClient();

    // Find the moral event linked to this ticket
    // Note: moral_events has immutability rules, so we query but cannot update directly.
    // Instead, we insert a resolution record into the audit ledger.
    const { data: moralEvent } = await supabase
      .from('moral_events')
      .select('*')
      .eq('oob_ticket_id', oobTicketId)
      .single();

    if (!moralEvent) return;

    const eventType = action === 'approve' ? 'moral.approved' : 'moral.rejected';

    await AuditLedgerService.appendEvent({
      event_type: eventType,
      module: 's8',
      tenant_id: tenantId,
      agent_id: moralEvent.agent_id,
      request_id: uuidv4(),
      payload: {
        moral_event_id: moralEvent.id,
        domain: moralEvent.domain,
        original_verdict: moralEvent.verdict,
        resolution: action,
        reviewer: reviewerId
      }
    });
  }
}
