/**
 * Pre-built PagerDuty Plugin
 *
 * Trigger: Critical S8 moral conflicts, S14 critical anomalies, S15 emergency stops
 * Action: POST to PagerDuty Events API v2 to create an incident for the on-call engineer.
 *
 * Installation: endpoint_url = https://events.pagerduty.com/v2/enqueue
 * auth_header = Authorization: Token token=<routing_key>
 */

export const PAGERDUTY_PLUGIN_TEMPLATE = {
  name: 'PagerDuty — Critical Alert Routing',
  description:
    'Routes critical RuneSignal events to PagerDuty on-call engineer. Triggers on: critical S8 SOUL conflicts, S14 critical behavioral anomalies, and S15 physical AI emergency stops.',
  plugin_type: 'webhook',
  category: 'alerting',
  icon: '🚨',
  triggers: [
    'moral.conflict',
    'anomaly.detected',
    'physical.emergency_stop',
    'agent.auto_suspended_anomaly',
    'firewall.action.blocked',
  ],
  retry_count: 5,      // critical — retry aggressively
  timeout_ms: 10000,
};

/**
 * Formats a RuneSignal event into a PagerDuty Events API v2 payload.
 * Only creates PagerDuty incidents for truly critical events.
 */
export function buildPagerDutyEvent(
  routingKey: string,
  event: {
    event_type: string;
    tenant_id: string;
    agent_id?: string | null;
    payload: Record<string, any>;
  }
): Record<string, any> {
  const severityMap: Record<string, 'critical' | 'error' | 'warning' | 'info'> = {
    'physical.emergency_stop': 'critical',
    'agent.auto_suspended_anomaly': 'critical',
    'moral.conflict': 'error',
    'anomaly.detected': 'error',
    'firewall.action.blocked': 'warning',
  };

  const severity = severityMap[event.event_type] || 'warning';

  return {
    routing_key: routingKey,
    event_action: 'trigger',
    payload: {
      summary: `[RuneSignal ${severity.toUpperCase()}] ${event.event_type} — Agent ${event.agent_id?.slice(0, 8) || 'unknown'}`,
      severity,
      source: `runesignal-tenant-${event.tenant_id.slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      component: 'runesignal-governance',
      group: 'agent-security',
      class: event.event_type,
      custom_details: {
        tenant_id: event.tenant_id,
        agent_id: event.agent_id,
        event_type: event.event_type,
        ...event.payload,
      },
    },
    dedup_key: `runesignal-${event.event_type}-${event.agent_id}-${Date.now()}`,
    links: [
      {
        href: `https://app.runesignal.ai/anomaly?agent=${event.agent_id}`,
        text: 'View in RuneSignal',
      },
    ],
  };
}
