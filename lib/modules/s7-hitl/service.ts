import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { WebhookEmitter } from '../../webhooks/emitter';
import { IntegrationDispatcher } from '../../integrations/dispatcher';
import { CreateExceptionRequest, ExceptionTicket, ResolveExceptionRequest } from './types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class HitlService {
  /**
   * Creates a new Human-in-the-loop exception ticket.
   * Agents call this when they encounter an unknown situation or require authorization.
   */
  static async createException(tenantId: string, agentId: string, request: CreateExceptionRequest): Promise<ExceptionTicket> {
    const supabase = createAdminClient();

    // Determine SLA deadline based on priority
    const priority = request.priority || 'medium';
    const slaDeadline = new Date();
    switch (priority) {
      case 'critical': slaDeadline.setMinutes(slaDeadline.getMinutes() + 15); break; // 15 mins
      case 'high': slaDeadline.setHours(slaDeadline.getHours() + 1); break; // 1 hour
      case 'low': slaDeadline.setHours(slaDeadline.getHours() + 24); break; // 24 hours
      default: slaDeadline.setHours(slaDeadline.getHours() + 4); break; // 4 hours
    }

    const ticketId = uuidv4();
    const { data: ticket, error } = await supabase
      .from('hitl_exceptions')
      .insert({
        id: ticketId,
        tenant_id: tenantId,
        agent_id: agentId,
        title: request.title,
        description: request.description,
        priority: priority,
        status: 'open',
        context_data: request.context_data || {},
        sla_deadline: slaDeadline.toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create exception: ${error.message}`);

    // Audit and notify
    await AuditLedgerService.appendEvent({
      event_type: 'hitl.exception_created',
      module: 's7',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: ticketId,
      payload: { title: request.title, priority, sla_deadline: slaDeadline.toISOString() }
    });

    await WebhookEmitter.notifyTenant(tenantId, `⚠️ HITL Request [${priority.toUpperCase()}]: ${request.title}`, {
      Agent: agentId,
      Description: request.description,
      TicketID: ticketId
    });

    // Dispatch to integration channels (Slack, Teams, Jira, ServiceNow)
    // Fire-and-forget — don't block ticket creation on integration success
    IntegrationDispatcher.dispatchHitlCreated(tenantId, {
      id: ticketId,
      tenant_id: tenantId,
      agent_id: agentId,
      title: request.title,
      description: request.description,
      priority: priority as 'critical' | 'high' | 'medium' | 'low',
      status: 'open',
      context_data: request.context_data || {},
      sla_deadline: slaDeadline.toISOString(),
      created_at: new Date().toISOString(),
    }).then(async (dispatchResults) => {
      // Store external refs from all successful dispatches
      const externalRefs: Record<string, unknown> = {};
      for (const result of dispatchResults) {
        if (result.success && result.external_ref) {
          externalRefs[result.provider] = result.external_ref;
        }
      }
      if (Object.keys(externalRefs).length > 0) {
        const supabase = createAdminClient();
        await supabase
          .from('hitl_exceptions')
          .update({ external_refs: externalRefs })
          .eq('id', ticketId);
      }
    }).catch(e => console.error('[HITL] Integration dispatch failed:', e));

    return ticket;
  }

  /**
   * Resolves an open exception (Approve/Reject)
   */
  static async resolveException(tenantId: string, ticketId: string, request: ResolveExceptionRequest): Promise<ExceptionTicket> {
    const supabase = createAdminClient();
    
    // Validate ticket exists and is open
    const { data: currentTicket, error: fetchError } = await supabase
      .from('hitl_exceptions')
      .select('status, agent_id')
      .eq('id', ticketId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !currentTicket) throw new Error('Exception ticket not found');
    if (currentTicket.status !== 'open') throw new Error(`Ticket is already ${currentTicket.status}`);

    const newStatus = request.action === 'approve' ? 'approved' : 'rejected';

    const { data: updatedTicket, error: updateError } = await supabase
      .from('hitl_exceptions')
      .update({
        status: newStatus,
        resolved_by: request.reviewer_id,
        resolution_reason: request.reason,
        resolved_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to resolve ticket: ${updateError.message}`);

    // Audit Log Decision
    await AuditLedgerService.appendEvent({
      event_type: `hitl.exception_resolved`,
      module: 's7',
      tenant_id: tenantId,
      agent_id: currentTicket.agent_id,
      request_id: ticketId,
      payload: { decision: newStatus, reason: request.reason, reviewer: request.reviewer_id }
    });

    // Create signed approval receipt in the audit ledger
    let receiptSignature: string | undefined;
    let receiptEventId: string | undefined;

    try {
      const receiptPayload = {
        approval_id: ticketId,
        decision: request.action,
        decided_by: request.reviewer_id || 'api-reviewer',
        reason: request.reason,
        decided_at: new Date().toISOString(),
        context_hash: crypto.createHash('sha256')
          .update(JSON.stringify(updatedTicket.context_data || {}))
          .digest('hex'),
      };

      const event = await AuditLedgerService.appendEvent({
        event_type: 'approval.decided',
        module: 's7',
        tenant_id: tenantId,
        agent_id: currentTicket.agent_id,
        payload: receiptPayload,
      });

      receiptSignature = event?.signature;
      receiptEventId = event?.id;
    } catch (e) {
      // Don't fail the approval if audit logging fails, but log it
      console.error('Failed to create approval receipt:', e);
    }

    await WebhookEmitter.notifyTenant(tenantId, `✅ HITL Resolved: ${ticketId.split('-')[0]} was ${newStatus.toUpperCase()}`, {
      Reason: request.reason
    });

    // Dispatch resolution to integration channels (update Slack message, transition Jira, etc.)
    IntegrationDispatcher.dispatchHitlResolved(tenantId, {
      id: ticketId,
      tenant_id: tenantId,
      agent_id: currentTicket.agent_id,
      title: updatedTicket.title || ticketId,
      description: updatedTicket.description || '',
      priority: updatedTicket.priority || 'medium',
      status: newStatus,
      context_data: updatedTicket.context_data || {},
      sla_deadline: updatedTicket.sla_deadline || '',
      created_at: updatedTicket.created_at || '',
      external_refs: updatedTicket.external_refs || {},
    } as any).catch(e => console.error('[HITL] Resolved dispatch failed:', e));

    // 2. Mock Training Pipeline Webhook (Item 11)
    if (newStatus === 'approved') {
       const trainingWebhook = process.env.TENANT_TRAINING_WEBHOOK || 'https://api.runesignal.com/v1/training/webhook';
       console.log(`[TRAINING] Triggering pipeline update for ticket ${ticketId} via ${trainingWebhook}...`);
       
       await fetch(trainingWebhook, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           ticket_id: ticketId,
           action: 'fine-tune',
           agent_id: currentTicket.agent_id,
           tenant_id: tenantId
         })
       }).catch(e => console.warn("Training webhook failed (intended for mock/integration):", e.message));
    }

    return {
      ...updatedTicket,
      receipt_signature: receiptSignature,
      receipt_event_id: receiptEventId,
    };
  }

  /**
   * Scans for open exceptions that have breached their SLA.
   * Checks context_data.sla_auto_action to determine behavior:
   *   - 'approve': auto-approve via resolveException (creates signed receipt)
   *   - 'reject': auto-reject via resolveException (creates signed receipt)
   *   - 'escalate' or absent: escalate (existing behavior)
   */
  static async checkSlas(tenantId?: string): Promise<number> {
    const supabase = createAdminClient();

    // Step 1: Query overdue open tickets (do NOT bulk-update yet)
    let query = supabase
      .from('hitl_exceptions')
      .select('id, title, tenant_id, agent_id, context_data')
      .eq('status', 'open')
      .lt('sla_deadline', new Date().toISOString());

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: overdueTickets, error } = await query;

    if (error) {
      console.error('SLA check query failed:', error.message);
      return 0;
    }

    if (!overdueTickets || overdueTickets.length === 0) return 0;

    let processed = 0;

    for (const ticket of overdueTickets) {
      const autoAction = ticket.context_data?.sla_auto_action as string | undefined;

      if (autoAction === 'approve' || autoAction === 'reject') {
        // Auto-approve or auto-reject via resolveException (creates signed receipt)
        try {
          await HitlService.resolveException(ticket.tenant_id, ticket.id, {
            action: autoAction,
            reason: `Auto-${autoAction}d: SLA expired without human response`,
            reviewer_id: 'system:sla_auto',
          });

          // Audit the auto-resolution
          await AuditLedgerService.appendEvent({
            event_type: 'approval.auto_resolved',
            module: 's7',
            tenant_id: ticket.tenant_id,
            agent_id: ticket.agent_id,
            payload: {
              approval_id: ticket.id,
              auto_action: autoAction,
              sla_deadline: ticket.context_data?.sla_deadline,
              reason: 'SLA expired without human response',
            },
          });

          processed++;
        } catch (e) {
          console.error(`SLA auto-${autoAction} failed for ticket ${ticket.id}:`, e);
          // Fall through to escalation on failure
          await HitlService._escalateTicket(supabase, ticket);
          processed++;
        }
      } else {
        // Default: escalate (existing behavior)
        await HitlService._escalateTicket(supabase, ticket);
        processed++;
      }
    }

    return processed;
  }

  /**
   * Escalates a single overdue ticket — extracted for reuse in SLA auto-action fallback.
   */
  static async _escalateTicket(
    supabase: ReturnType<typeof createAdminClient>,
    ticket: { id: string; title: string; tenant_id: string; agent_id: string }
  ): Promise<void> {
    await supabase
      .from('hitl_exceptions')
      .update({ status: 'escalated' })
      .eq('id', ticket.id);

    await AuditLedgerService.appendEvent({
      event_type: 'hitl.sla_breach',
      module: 's7',
      tenant_id: ticket.tenant_id,
      agent_id: ticket.agent_id,
      request_id: ticket.id,
      payload: { title: ticket.title, status: 'escalated' },
    });

    await WebhookEmitter.notifyTenant(
      ticket.tenant_id,
      `🚨 SLA BREACH: Ticket ${ticket.id.split('-')[0]} [${ticket.title}] has been escalated!`,
      { Status: 'ESCALATED', Original_Title: ticket.title },
    );
  }
}
