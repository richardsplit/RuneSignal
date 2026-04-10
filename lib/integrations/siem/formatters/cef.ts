/**
 * RuneSignal SIEM — CEF (Common Event Format) Formatter
 * Compatible with Splunk, QRadar, ArcSight.
 *
 * CEF format: CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
 */

const CEF_VERSION = '0';
const DEVICE_VENDOR = 'RuneSignal';
const DEVICE_PRODUCT = 'ActionFirewall';
const DEVICE_VERSION = '1.0';

const SEVERITY_MAP: Record<string, string> = {
  'firewall.evaluation': '5',
  'hitl.exception_created': '7',
  'hitl.exception_resolved': '3',
  'hitl.sla_breach': '9',
  'agent.registered': '2',
  'agent.suspended': '6',
  'agent.revoked': '8',
  'agent.permission_violation': '7',
  'moral.conflict': '7',
  'model.version_anomaly_detected': '6',
};

export function formatAsCEF(event: Record<string, unknown>): string {
  const eventType = String(event.event_type || 'system.event');
  const severity = SEVERITY_MAP[eventType] || '5';
  const signatureId = eventType.replace(/\./g, '_').toUpperCase();
  const name = formatEventName(eventType);

  // CEF header
  const header = [
    `CEF:${CEF_VERSION}`,
    DEVICE_VENDOR,
    DEVICE_PRODUCT,
    DEVICE_VERSION,
    signatureId,
    name,
    severity,
  ].join('|');

  // CEF extension fields
  const payload = (event.payload as Record<string, unknown>) || {};
  const ext: string[] = [
    `rt=${new Date(String(event.created_at || '')).getTime() || Date.now()}`,
    `dvchost=runesignal-edge`,
    `src=${event.tenant_id || 'unknown'}`,
    `suser=${event.agent_id || 'system'}`,
    `requestMethod=${eventType}`,
    `cs1Label=module cs1=${event.module || 'system'}`,
    `cs2Label=requestId cs2=${event.request_id || ''}`,
  ];

  // Add key payload fields
  if (payload.verdict) ext.push(`cs3Label=verdict cs3=${payload.verdict}`);
  if (payload.risk_score !== undefined) ext.push(`cn1Label=riskScore cn1=${payload.risk_score}`);
  if (payload.action) ext.push(`act=${payload.action}`);
  if (payload.resource) ext.push(`request=${payload.resource}`);

  return `${header}|${ext.join(' ')}`;
}

export function formatBatchAsCEF(events: Record<string, unknown>[]): string {
  return events.map(formatAsCEF).join('\n');
}

function formatEventName(eventType: string): string {
  return eventType
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
