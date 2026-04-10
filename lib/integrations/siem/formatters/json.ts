/**
 * RuneSignal SIEM — Structured JSON Formatter
 * Compatible with Elastic SIEM, Datadog, Splunk HEC.
 */

export function formatAsJSON(event: Record<string, unknown>): Record<string, unknown> {
  return {
    '@timestamp': event.created_at || new Date().toISOString(),
    '@version': '1',
    source: 'runesignal',
    event: {
      kind: 'event',
      category: getEventCategory(String(event.event_type || '')),
      type: getEventType(String(event.event_type || '')),
      action: event.event_type,
      severity: getSeverityCode(String(event.event_type || '')),
      id: event.id,
      module: event.module,
    },
    runesignal: {
      tenant_id: event.tenant_id,
      agent_id: event.agent_id,
      request_id: event.request_id,
      signature: event.signature,
      payload: event.payload,
    },
    tags: ['runesignal', 'ai-governance', `module:${event.module}`],
  };
}

export function formatBatchAsJSONL(events: Record<string, unknown>[]): string {
  return events.map(e => JSON.stringify(formatAsJSON(e))).join('\n');
}

function getEventCategory(eventType: string): string {
  if (eventType.startsWith('agent.')) return 'iam';
  if (eventType.startsWith('hitl.')) return 'process';
  if (eventType.startsWith('moral.')) return 'process';
  if (eventType.startsWith('firewall.')) return 'network';
  return 'configuration';
}

function getEventType(eventType: string): string {
  if (eventType.includes('violation') || eventType.includes('block') || eventType.includes('conflict')) return 'denied';
  if (eventType.includes('created') || eventType.includes('registered')) return 'creation';
  if (eventType.includes('resolved') || eventType.includes('approved')) return 'allowed';
  return 'info';
}

function getSeverityCode(eventType: string): number {
  if (eventType.includes('breach') || eventType.includes('revoke')) return 90;
  if (eventType.includes('violation') || eventType.includes('conflict')) return 70;
  if (eventType.includes('suspended') || eventType.includes('anomaly')) return 60;
  if (eventType.includes('exception') || eventType.includes('hitl')) return 50;
  return 30;
}
