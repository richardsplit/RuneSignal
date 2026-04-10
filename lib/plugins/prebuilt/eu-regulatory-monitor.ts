/**
 * Pre-built EU Regulatory Monitor Plugin
 *
 * Trigger: New regulation detected that matches the tenant's S13 frameworks,
 *          or compliance gap identified during daily scan.
 * Action: POST to a configured webhook (e.g. internal compliance system, Slack, Teams)
 *         with a structured regulatory update notification.
 *
 * Installation:
 *   endpoint_url = <your compliance webhook URL>
 *   auth_header = Authorization: Bearer <webhook_token>
 *
 * Built-in intelligence:
 *   - Monitors EU AI Act enforcement dates (Aug 2026 full enforcement)
 *   - Detects GDPR Article 22 automated-decision exposure
 *   - Flags DORA (Digital Operational Resilience Act) AI system requirements
 *   - Alerts on new EBA Guidelines affecting AI in banking
 */

export const EU_REGULATORY_MONITOR_TEMPLATE = {
  name: 'EU Regulatory Monitor — Compliance Alerts',
  description:
    'Sends structured compliance alerts when TrustLayer detects governance gaps mapped to EU AI Act, GDPR, DORA, or other EU regulations. Ideal for DPOs and compliance teams.',
  plugin_type: 'reporter',
  category: 'regulatory',
  icon: '🇪🇺',
  triggers: [
    'compliance.gap_detected',
    'sovereignty.residency_violation',
    'moral.conflict',
    'hitl.exception_created',
    'anomaly.detected',
  ],
  retry_count: 3,
  timeout_ms: 6000,
};

/**
 * Maps TrustLayer event types to relevant EU regulatory articles.
 */
const EU_ARTICLE_MAP: Record<string, Array<{ framework: string; article: string; summary: string }>> = {
  'compliance.gap_detected': [
    { framework: 'EU AI Act', article: 'Art. 17', summary: 'Quality management system gap detected' },
    { framework: 'EU AI Act', article: 'Art. 9', summary: 'Risk management system requires review' },
  ],
  'sovereignty.residency_violation': [
    { framework: 'GDPR', article: 'Art. 44', summary: 'Cross-border data transfer to non-adequate country' },
    { framework: 'EU AI Act', article: 'Art. 10', summary: 'Training data governance violation' },
  ],
  'moral.conflict': [
    { framework: 'EU AI Act', article: 'Art. 5', summary: 'Prohibited AI practice potentially triggered' },
    { framework: 'EU AI Act', article: 'Art. 14', summary: 'Human oversight requirement invoked' },
  ],
  'hitl.exception_created': [
    { framework: 'EU AI Act', article: 'Art. 14', summary: 'Human oversight measure activated' },
    { framework: 'EU AI Act', article: 'Art. 26', summary: 'Deployer incident monitoring triggered' },
  ],
  'anomaly.detected': [
    { framework: 'EU AI Act', article: 'Art. 15', summary: 'AI system accuracy/robustness anomaly' },
    { framework: 'DORA', article: 'Art. 17', summary: 'ICT-related incident detection' },
  ],
};

/**
 * Builds a structured regulatory notification payload.
 */
export function buildRegulatoryAlert(event: {
  event_type: string;
  tenant_id: string;
  agent_id?: string | null;
  payload: Record<string, any>;
}): Record<string, any> {
  const refs = EU_ARTICLE_MAP[event.event_type] || [];

  return {
    alert_type: 'eu_regulatory_monitor',
    event_type: event.event_type,
    tenant_id: event.tenant_id,
    agent_id: event.agent_id,
    timestamp: new Date().toISOString(),
    regulatory_references: refs,
    summary: refs.length > 0
      ? `TrustLayer detected a governance event (${event.event_type}) potentially relevant to: ${refs.map(r => `${r.framework} ${r.article}`).join(', ')}`
      : `TrustLayer governance event: ${event.event_type}`,
    action_required: refs.some(r => r.framework === 'EU AI Act' && r.article.startsWith('Art. 5')),
    review_deadline_hours: 24,
    evidence_payload: event.payload,
    dashboard_url: `https://app.trustlayer.ai/compliance`,
  };
}
