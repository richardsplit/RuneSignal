import { createServerClient } from '@lib/db/supabase';

/**
 * Core Webhook Emitter used to notify external GRC systems
 * (Slack, ServiceNow, Jira, etc.) when an anomaly or rule violation is detected.
 * Refactored in Phase 2 to be tenant-aware.
 */
export class WebhookEmitter {
  /**
   * Send JSON payloads to configured URLs with exponential backoff.
   */
  static async emit(url: string, payload: Record<string, any>, maxRetries = 3): Promise<boolean> {
    if (!url) return false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) return true;
        console.warn(`WebhookEmitter: Retry ${attempt}/${maxRetries} to ${url} got status ${response.status}`);
      } catch (error) {
        console.warn(`WebhookEmitter: Network failure on attempt ${attempt}/${maxRetries} to ${url}`);
      }

      if (attempt < maxRetries) {
        const msToWait = Math.pow(2, attempt) * 500;
        await new Promise(res => setTimeout(res, msToWait));
      }
    }
    return false;
  }

  /**
   * Notifies a specific tenant via their configured channels.
   */
  static async notifyTenant(tenantId: string, message: string, eventDetails: any = null) {
    if (!tenantId) return;

    // Use service role for backend lookup
    const supabase = createServerClient();
    
    try {
      const { data: settings } = await supabase
        .from('webhook_settings')
        .select('slack_url, custom_url, is_active')
        .eq('tenant_id', tenantId)
        .single();

      if (!settings || !settings.is_active) return;

      const promises = [];

      // 1. Notify Slack
      if (settings.slack_url) {
        const slackPayload = {
          text: `*TrustLayer Alert (Tenant: ${tenantId.split('-')[0]}...)*\n${message}`,
          attachments: eventDetails ? [
            {
              color: '#f59e0b',
              fields: Object.keys(eventDetails).map(k => ({ title: k, value: String(eventDetails[k]), short: true }))
            }
          ] : []
        };
        promises.push(this.emit(settings.slack_url, slackPayload));
      }

      // 2. Notify Custom Hook
      if (settings.custom_url) {
        const customPayload = {
          tenant_id: tenantId,
          timestamp: new Date().toISOString(),
          message,
          event_details: eventDetails
        };
        promises.push(this.emit(settings.custom_url, customPayload));
      }

      await Promise.all(promises);
    } catch (err) {
      console.error(`WebhookEmitter: Error notifying tenant ${tenantId}`, err);
    }
  }
}
