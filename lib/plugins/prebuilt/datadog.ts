/**
 * Pre-built Datadog Plugin
 *
 * Trigger: '*' (all events — batched by cron every 5 min in production,
 *          but also fires real-time on critical events)
 * Action: POST custom metrics and events to Datadog via the Events API.
 *
 * Installation: endpoint_url = https://api.datadoghq.com/api/v1/events
 * auth_header = DD-API-KEY: <your_datadog_api_key>
 *
 * Metrics sent (as Datadog events with tags):
 *   - runesignal.certificates.created (count)
 *   - runesignal.firewall.blocks (count)
 *   - runesignal.hitl.open (gauge)
 *   - runesignal.anomalies.detected (count)
 *   - runesignal.cost.usd (gauge per agent)
 */

export const DATADOG_PLUGIN_TEMPLATE = {
  name: 'Datadog — Agent Observability',
  description:
    'Streams RuneSignal governance metrics to Datadog as custom events. Track certificate rates, firewall block rates, HITL open counts, anomaly rates, and per-agent cost in real time.',
  plugin_type: 'reporter',
  category: 'observability',
  icon: '🐶',
  triggers: [
    'provenance.certificate',
    'firewall.action.blocked',
    'hitl.exception_created',
    'hitl.exception_resolved',
    'anomaly.detected',
    'finops.budget_exceeded',
  ],
  retry_count: 2,
  timeout_ms: 5000,
};

/**
 * Formats a RuneSignal audit event into a Datadog Event API payload.
 */
export function buildDatadogEvent(event: {
  event_type: string;
  tenant_id: string;
  agent_id?: string | null;
  payload: Record<string, any>;
}): Record<string, any> {
  const severityMap: Record<string, string> = {
    'firewall.action.blocked': 'error',
    'anomaly.detected': 'warning',
    'finops.budget_exceeded': 'warning',
    'hitl.exception_created': 'info',
  };

  return {
    title: `RuneSignal: ${event.event_type}`,
    text: `%%% \n**Tenant:** ${event.tenant_id}\n**Agent:** ${event.agent_id || 'n/a'}\n**Payload:** \`\`\`json\n${JSON.stringify(event.payload, null, 2).slice(0, 800)}\n\`\`\`\n %%%`,
    alert_type: severityMap[event.event_type] || 'info',
    tags: [
      `runesignal:true`,
      `event_type:${event.event_type.replace(/\./g, '_')}`,
      `tenant:${event.tenant_id}`,
      event.agent_id ? `agent:${event.agent_id}` : 'agent:none',
    ],
    source_type_name: 'runesignal',
  };
}
