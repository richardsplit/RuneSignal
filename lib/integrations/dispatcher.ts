/**
 * RuneSignal Integration Dispatcher
 *
 * Central routing layer that dispatches HITL ticket events to all active
 * integration channels for a tenant (Slack, Teams, Jira, ServiceNow, webhook).
 *
 * All dispatch calls are routed through IntegrationRegistry adapters.
 * Called by HitlService.createException() and HitlService.resolveException().
 */

import { createAdminClient } from '../db/supabase';
import { IntegrationRegistry } from './adapters/IntegrationRegistry';
import type { HitlApprovalPayload, HitlDecisionPayload, ExternalRef as AdapterExternalRef } from './adapters/IntegrationAdapter.interface';
import {
  IntegrationProvider,
  DispatchResult,
  HitlTicketSummary,
} from './types';

export class IntegrationDispatcher {
  /**
   * Dispatches a newly created HITL ticket to all active channels.
   * Returns a map of provider -> external reference (e.g. Slack message ts, Jira issue key).
   *
   * @param channelFilter When provided, only dispatch to channels matching these providers.
   *                      When absent, dispatch to all active channels (backwards compatible).
   */
  static async dispatchHitlCreated(
    tenantId: string,
    ticket: HitlTicketSummary,
    channelFilter?: IntegrationProvider[]
  ): Promise<DispatchResult[]> {
    const channels = await IntegrationDispatcher._getActiveChannels(tenantId, channelFilter);
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
   *
   * @param channelFilter When provided, only dispatch to channels matching these providers.
   *                      When absent, dispatch to all active channels (backwards compatible).
   */
  static async dispatchHitlResolved(
    tenantId: string,
    ticket: HitlTicketSummary & { external_refs?: Record<string, unknown> },
    channelFilter?: IntegrationProvider[]
  ): Promise<DispatchResult[]> {
    const channels = await IntegrationDispatcher._getActiveChannels(tenantId, channelFilter);
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

  // --- Private helpers ---

  private static async _getActiveChannels(
    tenantId: string,
    channelFilter?: IntegrationProvider[]
  ) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('integration_channels')
      .select('provider, config')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error || !data) return [];

    let channels = data as Array<{ provider: IntegrationProvider; config: Record<string, unknown> }>;

    if (channelFilter && channelFilter.length > 0) {
      channels = channels.filter(ch => channelFilter.includes(ch.provider));
    }

    return channels;
  }

  private static _ticketToApprovalPayload(ticket: HitlTicketSummary): HitlApprovalPayload {
    return {
      approval_id: ticket.id,
      agent_id: ticket.agent_id,
      action_type: ticket.title,
      action_description: ticket.description,
      blast_radius: ticket.priority, // maps priority to blast_radius for adapters
      reversible: false,
      priority: ticket.priority,
      status: ticket.status,
      created_at: ticket.created_at,
      expires_at: ticket.sla_deadline,
      review_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/approvals/${ticket.id}`,
    };
  }

  private static _ticketToDecisionPayload(
    ticket: HitlTicketSummary
  ): HitlDecisionPayload {
    return {
      approval_id: ticket.id,
      decision: ticket.status as 'approved' | 'rejected',
      decided_at: new Date().toISOString(),
    };
  }

  private static _externalRefForProvider(
    provider: IntegrationProvider,
    externalRefs: Record<string, unknown>
  ): AdapterExternalRef | undefined {
    const ref = externalRefs[provider] as Record<string, unknown> | undefined;
    if (!ref) return undefined;

    // Normalize provider-specific external_refs stored in the DB
    // into the adapter's ExternalRef shape
    if (provider === 'slack') {
      const slackRef = ref as { channel?: string; ts?: string };
      if (slackRef.ts) {
        return { external_id: slackRef.ts, metadata: { channel: slackRef.channel, ts: slackRef.ts } };
      }
    } else if (provider === 'jira') {
      const jiraRef = ref as { issue_key?: string; issue_id?: string };
      if (jiraRef.issue_id) {
        return { external_id: jiraRef.issue_key || '', metadata: { issue_key: jiraRef.issue_key, issue_id: jiraRef.issue_id } };
      }
    } else if (provider === 'servicenow') {
      const snowRef = ref as { sys_id?: string; number?: string };
      if (snowRef.sys_id) {
        return { external_id: snowRef.sys_id, metadata: { sys_id: snowRef.sys_id, number: snowRef.number } };
      }
    } else if (provider === 'webhook') {
      const whRef = ref as { url?: string; delivered_at?: string };
      if (whRef.url) {
        return { external_id: whRef.url, metadata: ref };
      }
    }

    return undefined;
  }

  private static async _dispatchCreated(
    provider: IntegrationProvider,
    config: Record<string, unknown>,
    ticket: HitlTicketSummary
  ): Promise<DispatchResult> {
    const adapter = IntegrationRegistry.get(provider);
    if (!adapter) {
      return { provider, success: false, error: `No adapter registered for provider: ${provider}` };
    }

    const payload = IntegrationDispatcher._ticketToApprovalPayload(ticket);
    const result = await adapter.onApprovalCreated(config, payload);

    return {
      provider,
      success: result.success,
      external_ref: result.external_ref?.metadata as DispatchResult['external_ref'],
      error: result.error,
    };
  }

  private static async _dispatchResolved(
    provider: IntegrationProvider,
    config: Record<string, unknown>,
    ticket: HitlTicketSummary,
    externalRefs: Record<string, unknown>
  ): Promise<DispatchResult> {
    const adapter = IntegrationRegistry.get(provider);
    if (!adapter) {
      return { provider, success: false, error: `No adapter registered for provider: ${provider}` };
    }

    const payload = IntegrationDispatcher._ticketToDecisionPayload(ticket);
    const adapterRef = IntegrationDispatcher._externalRefForProvider(provider, externalRefs);
    const result = await adapter.onApprovalDecided(config, payload, adapterRef);

    return {
      provider,
      success: result.success,
      error: result.error,
    };
  }
}
