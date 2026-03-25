/**
 * Core Webhook Emitter used to notify external GRC systems
 * (Slack, ServiceNow, Jira, etc.) when an anomaly or rule violation is detected.
 */
export class WebhookEmitter {
  /**
   * A resilient emitter that implements exponential backoff retry.
   * Sends JSON payloads to configured URLs.
   */
  static async emit(url: string, payload: Record<string, any>, maxRetries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return true; // Successfully emitted
        }
        console.warn(`WebhookEmitter: Retry ${attempt}/${maxRetries} to ${url} got status ${response.status}`);
      } catch (error) {
        console.warn(`WebhookEmitter: Network failure on attempt ${attempt}/${maxRetries} to ${url}`);
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        const msToWait = Math.pow(2, attempt) * 500; // 1s -> 2s
        await new Promise(res => setTimeout(res, msToWait));
      }
    }

    console.error(`WebhookEmitter: Failed to deliver to ${url} after ${maxRetries} attempts.`);
    return false;
  }

  /**
   * Helper method to send specific event to configured Slack
   */
  static async notifySlack(message: string, eventDetails: any = null) {
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackUrl) return;

    const payload = {
      text: `*TrustLayer Alert*\n${message}`,
      attachments: eventDetails ? [
        {
          color: '#f59e0b', // Amber
          fields: Object.keys(eventDetails).map(k => ({ title: k, value: String(eventDetails[k]), short: true }))
        }
      ] : []
    };

    return this.emit(slackUrl, payload);
  }
}
