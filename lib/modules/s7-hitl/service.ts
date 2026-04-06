import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { WebhookEmitter } from '../../webhooks/emitter';
import { CreateExceptionRequest, ExceptionTicket, ResolveExceptionRequest } from './types';
import { v4 as uuidv4 } from 'uuid';

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

    await WebhookEmitter.notifyTenant(tenantId, `✅ HITL Resolved: ${ticketId.split('-')[0]} was ${newStatus.toUpperCase()}`, {
      Reason: request.reason
    });

    // 2. Mock Training Pipeline Webhook (Item 11)
    if (newStatus === 'approved') {
       const trainingWebhook = process.env.TENANT_TRAINING_WEBHOOK || 'https://api.trustlayer.com/v1/training/webhook';
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

    return updatedTicket;
  }

  /**
   * Scans for open exceptions that have breached their SLA and escalates them.
   */
  static async checkSlas(tenantId?: string): Promise<number> {
    const supabase = createAdminClient();
    
    let query = supabase
      .from('hitl_exceptions')
      .update({ status: 'escalated' })
      .eq('status', 'open')
      .lt('sla_deadline', new Date().toISOString());

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.select('id, title, tenant_id, agent_id');

    if (error) {
      console.error('SLA Escalation Failed:', error.message);
      return 0;
    }

    if (data && data.length > 0) {
      for (const ticket of data) {
        await AuditLedgerService.appendEvent({
          event_type: 'hitl.sla_breach',
          module: 's7',
          tenant_id: ticket.tenant_id,
          agent_id: ticket.agent_id,
          request_id: ticket.id,
          payload: { title: ticket.title, status: 'escalated' }
        });

        await WebhookEmitter.notifyTenant(ticket.tenant_id, `🚨 SLA BREACH: Ticket ${ticket.id.split('-')[0]} [${ticket.title}] has been escalated!`, {
          Status: 'ESCALATED',
          Original_Title: ticket.title
        });
      }
    }

    return data?.length || 0;
  }
}
