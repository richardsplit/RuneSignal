/**
 * TrustLayer Integration Dispatcher
 *
 * Central routing layer that dispatches HITL ticket events to all active
 * integration channels for a tenant (Slack, Teams, Jira, ServiceNow, webhook).
 *
 * Called by HitlService.createException() and HitlService.resolveException().
 */

import { createAdminClient } from '../db/supabase';
import {
  IntegrationProvider,
  DispatchResult,
  HitlTicketSummary,
  SlackChannelConfig,
  TeamsChannelConfig,
  JiraChannelConfig,
  ServiceNowChannelConfig,
  WebhookChannelConfig,
} from './types';

export class IntegrationDispatcher {
  /**
   * Dispatches a newly created HITL ticket to all active channels.
   * Returns a map of provider → external reference (e.g. Slack message ts, Jira issue key).
   */
  static async dispatchHitlCreated(
    tenantId: string,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult[]> {
    const channels = await IntegrationDispatcher._getActiveChannels(tenantId);
    const results = await Promise.allSettled(
      channels.map(ch => IntegrationDispatcher._dispatchCreated(ch.provider, ch.config, ticket))
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.error(`[Dispatcher] ${channels[i].provider} dispatch failed:`, r.reason);
      return { provider: channels[i].provider, success: false, error: String(r.reason) };
    });
  }

  /**
   * Dispatches a resolution (approve/reject) to all active channels.
   * Updates Slack messages, transitions Jira issues, etc.
   */
  static async dispatchHitlResolved(
    tenantId: string,
    ticket: HitlTicketSummary & { external_refs?: Record<string, unknown> }
  ): Promise<DispatchResult[]> {
    const channels = await IntegrationDispatcher._getActiveChannels(tenantId);
    const results = await Promise.allSettled(
      channels.map(ch =>
        IntegrationDispatcher._dispatchResolved(ch.provider, ch.config, ticket, ticket.external_refs || {})
      )
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.error(`[Dispatcher] ${channels[i].provider} resolved-dispatch failed:`, r.reason);
      return { provider: channels[i].provider, success: false, error: String(r.reason) };
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private static async _getActiveChannels(tenantId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('integration_channels')
      .select('provider, config')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error || !data) return [];
    return data as Array<{ provider: IntegrationProvider; config: Record<string, unknown> }>;
  }

  private static async _dispatchCreated(
    provider: IntegrationProvider,
    config: Record<string, unknown>,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult> {
    switch (provider) {
      case 'slack':
        return IntegrationDispatcher._slackCreate(config as unknown as SlackChannelConfig, ticket);
      case 'teams':
        return IntegrationDispatcher._teamsCreate(config as unknown as TeamsChannelConfig, ticket);
      case 'jira':
        return IntegrationDispatcher._jiraCreate(config as unknown as JiraChannelConfig, ticket);
      case 'servicenow':
        return IntegrationDispatcher._servicenowCreate(config as unknown as ServiceNowChannelConfig, ticket);
      case 'webhook':
        return IntegrationDispatcher._webhookSend(config as unknown as WebhookChannelConfig, 'hitl.created', ticket);
      default:
        return { provider, success: false, error: 'Unknown provider' };
    }
  }

  private static async _dispatchResolved(
    provider: IntegrationProvider,
    config: Record<string, unknown>,
    ticket: HitlTicketSummary,
    externalRefs: Record<string, unknown>
  ): Promise<DispatchResult> {
    switch (provider) {
      case 'slack':
        return IntegrationDispatcher._slackUpdate(config as unknown as SlackChannelConfig, ticket, externalRefs);
      case 'jira':
        return IntegrationDispatcher._jiraTransition(config as unknown as JiraChannelConfig, ticket, externalRefs);
      case 'webhook':
        return IntegrationDispatcher._webhookSend(config as unknown as WebhookChannelConfig, 'hitl.resolved', ticket);
      default:
        // Teams and ServiceNow updates are handled via their own webhooks
        return { provider, success: true };
    }
  }

  // ─── Slack ───────────────────────────────────────────────────────────────

  private static async _slackCreate(
    config: SlackChannelConfig,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult> {
    const priorityEmoji: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${priorityEmoji[ticket.priority] || '⚠️'} *HITL Approval Required*\n*${ticket.title}*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Priority:*\n${ticket.priority.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Agent:*\n${ticket.agent_id.slice(0, 12)}…` },
          { type: 'mrkdwn', text: `*SLA Deadline:*\n${new Date(ticket.sla_deadline).toLocaleString()}` },
          { type: 'mrkdwn', text: `*Ticket ID:*\n${ticket.id.slice(0, 12)}…` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Description:*\n${ticket.description.slice(0, 300)}` },
      },
      {
        type: 'actions',
        block_id: `hitl_actions_${ticket.id}`,
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve', emoji: true },
            style: 'primary',
            action_id: `hitl_approve_${ticket.id}`,
            value: ticket.id,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Reject', emoji: true },
            style: 'danger',
            action_id: `hitl_reject_${ticket.id}`,
            value: ticket.id,
          },
        ],
      },
    ];

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.bot_token}`,
      },
      body: JSON.stringify({
        channel: config.channel_id,
        blocks,
        text: `HITL Approval Required: ${ticket.title}`,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      return { provider: 'slack', success: false, error: data.error };
    }

    return {
      provider: 'slack',
      success: true,
      external_ref: { channel: data.channel, ts: data.ts },
    };
  }

  private static async _slackUpdate(
    config: SlackChannelConfig,
    ticket: HitlTicketSummary,
    externalRefs: Record<string, unknown>
  ): Promise<DispatchResult> {
    const slackRef = externalRefs.slack as { channel: string; ts: string } | undefined;
    if (!slackRef?.ts) return { provider: 'slack', success: true }; // Nothing to update

    const statusEmoji = ticket.status === 'approved' ? '✅' : '❌';
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${statusEmoji} *HITL ${ticket.status.toUpperCase()}*\n*${ticket.title}*\n_Decision recorded in TrustLayer audit ledger._`,
        },
      },
    ];

    await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.bot_token}`,
      },
      body: JSON.stringify({ channel: slackRef.channel, ts: slackRef.ts, blocks, text: `HITL ${ticket.status}` }),
    });

    return { provider: 'slack', success: true };
  }

  // ─── Teams ───────────────────────────────────────────────────────────────

  private static async _teamsCreate(
    config: TeamsChannelConfig,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult> {
    // Adaptive Card for Teams
    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', size: 'Large', weight: 'Bolder', text: '⚠️ HITL Approval Required' },
            { type: 'TextBlock', text: ticket.title, wrap: true, weight: 'Bolder' },
            {
              type: 'FactSet',
              facts: [
                { title: 'Priority', value: ticket.priority.toUpperCase() },
                { title: 'Agent ID', value: ticket.agent_id.slice(0, 12) + '…' },
                { title: 'SLA', value: new Date(ticket.sla_deadline).toLocaleString() },
              ],
            },
            { type: 'TextBlock', text: ticket.description.slice(0, 300), wrap: true },
          ],
          actions: [
            {
              type: 'Action.Http',
              title: '✅ Approve',
              method: 'POST',
              url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/v1/integrations/teams/callback`,
              body: JSON.stringify({ ticket_id: ticket.id, action: 'approve' }),
            },
            {
              type: 'Action.Http',
              title: '❌ Reject',
              method: 'POST',
              url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/v1/integrations/teams/callback`,
              body: JSON.stringify({ ticket_id: ticket.id, action: 'reject' }),
            },
          ],
        },
      }],
    };

    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    return { provider: 'teams', success: response.ok };
  }

  // ─── Jira ────────────────────────────────────────────────────────────────

  private static async _jiraCreate(
    config: JiraChannelConfig,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult> {
    const priorityMap: Record<string, string> = {
      critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low',
    };

    const response = await fetch(`${config.base_url}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.user_email}:${config.api_token}`).toString('base64')}`,
      },
      body: JSON.stringify({
        fields: {
          project: { key: config.project_key },
          summary: `[TrustLayer HITL] ${ticket.title}`,
          description: {
            type: 'doc', version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: ticket.description }],
            }],
          },
          issuetype: { name: config.issue_type || 'Task' },
          priority: { name: priorityMap[ticket.priority] || 'Medium' },
          labels: ['trustlayer-hitl', `priority-${ticket.priority}`],
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { provider: 'jira', success: false, error: JSON.stringify(err) };
    }

    const data = await response.json();
    return {
      provider: 'jira',
      success: true,
      external_ref: { issue_key: data.key, issue_id: data.id },
    };
  }

  private static async _jiraTransition(
    config: JiraChannelConfig,
    ticket: HitlTicketSummary,
    externalRefs: Record<string, unknown>
  ): Promise<DispatchResult> {
    const jiraRef = externalRefs.jira as { issue_key: string; issue_id: string } | undefined;
    if (!jiraRef?.issue_id) return { provider: 'jira', success: true };

    // Add comment with resolution
    await fetch(`${config.base_url}/rest/api/3/issue/${jiraRef.issue_id}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.user_email}:${config.api_token}`).toString('base64')}`,
      },
      body: JSON.stringify({
        body: {
          type: 'doc', version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: `TrustLayer HITL resolved as: ${ticket.status.toUpperCase()}` }],
          }],
        },
      }),
    });

    return { provider: 'jira', success: true };
  }

  // ─── ServiceNow ──────────────────────────────────────────────────────────

  private static async _servicenowCreate(
    config: ServiceNowChannelConfig,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult> {
    const urgencyMap: Record<string, string> = { critical: '1', high: '2', medium: '3', low: '3' };

    const response = await fetch(`${config.instance_url}/api/now/table/${config.table || 'incident'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      },
      body: JSON.stringify({
        short_description: `[TrustLayer HITL] ${ticket.title}`,
        description: ticket.description,
        urgency: urgencyMap[ticket.priority] || '3',
        category: config.category || 'AI Governance',
        caller_id: 'TrustLayer',
        u_trustlayer_ticket_id: ticket.id,
      }),
    });

    if (!response.ok) {
      return { provider: 'servicenow', success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      provider: 'servicenow',
      success: true,
      external_ref: { sys_id: data.result?.sys_id, number: data.result?.number },
    };
  }

  // ─── Generic Webhook ─────────────────────────────────────────────────────

  private static async _webhookSend(
    config: WebhookChannelConfig,
    event: string,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult> {
    const payload = {
      event,
      ticket_id: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      agent_id: ticket.agent_id,
      sla_deadline: ticket.sla_deadline,
      created_at: ticket.created_at,
    };

    const body = JSON.stringify(payload);

    const headersToSend: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-TrustLayer-Event': event,
      ...(config.headers || {}),
    };

    if (config.secret) {
      // HMAC-SHA256 signing for webhook verification
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(config.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      headersToSend['X-TrustLayer-Signature'] = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers: headersToSend,
      body,
    });

    return {
      provider: 'webhook',
      success: response.ok,
      external_ref: response.ok ? { url: config.url, delivered_at: new Date().toISOString() } : undefined,
    };
  }
}
