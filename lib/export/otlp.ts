/**
 * S_OTLP — OpenTelemetry exporter for RuneSignal audit events.
 * Maps audit_events rows to OTLP LogRecord and Span formats.
 * Each exported record carries the Ed25519 signature as attribute runesignal.signature.
 *
 * EU AI Act Article 12 — record-keeping.
 * Env vars: OTLP_ENDPOINT, OTLP_API_KEY, OTLP_ENABLED
 */

export interface AuditEventRow {
  id?:        string;
  request_id: string;
  tenant_id:  string;
  event_type: string;
  agent_id?:  string;
  action?:    string;
  payload?:   Record<string, unknown>;
  signature?: string;
  created_at: string;
}

export interface OtlpLogRecord {
  timeUnixNano:   string;
  severityText:   string;
  severityNumber: number;
  body:           { stringValue: string };
  attributes:     OtlpAttribute[];
  traceId?:       string;
  spanId?:        string;
}

export interface OtlpSpan {
  traceId:           string;
  spanId:            string;
  name:              string;
  startTimeUnixNano: string;
  endTimeUnixNano:   string;
  attributes:        OtlpAttribute[];
  status:            { code: number };
}

interface OtlpAttribute {
  key:   string;
  value: { stringValue?: string; intValue?: string; boolValue?: boolean };
}

function toNano(iso: string): string {
  const ms = new Date(iso).getTime();
  return (ms * 1_000_000).toFixed(0);
}

function toAttr(key: string, value: string | number | boolean): OtlpAttribute {
  if (typeof value === 'boolean') return { key, value: { boolValue: value } };
  if (typeof value === 'number')  return { key, value: { intValue: String(value) } };
  return { key, value: { stringValue: String(value) } };
}

/**
 * Convert an audit event row to an OTLP LogRecord.
 */
export function toOtlpLogRecord(row: AuditEventRow): OtlpLogRecord {
  const attrs: OtlpAttribute[] = [
    toAttr('runesignal.tenant_id',  row.tenant_id),
    toAttr('runesignal.event_type', row.event_type),
    toAttr('runesignal.request_id', row.request_id),
  ];
  if (row.agent_id)  attrs.push(toAttr('runesignal.agent_id',  row.agent_id));
  if (row.action)    attrs.push(toAttr('runesignal.action',    row.action));
  if (row.signature) attrs.push(toAttr('runesignal.signature', row.signature));

  return {
    timeUnixNano:   toNano(row.created_at),
    severityText:   'INFO',
    severityNumber: 9,
    body:           { stringValue: `${row.event_type} — agent:${row.agent_id ?? 'unknown'} request:${row.request_id}` },
    attributes:     attrs,
  };
}

/**
 * Convert an audit event row to an OTLP Span.
 */
export function toOtlpSpan(row: AuditEventRow): OtlpSpan {
  const traceId = Buffer.from(row.request_id.replace(/-/g, '').padEnd(32, '0').slice(0, 32), 'hex').toString('hex');
  const spanId  = Buffer.from(row.request_id.replace(/-/g, '').padEnd(16, '0').slice(0, 16), 'hex').toString('hex');

  const attrs: OtlpAttribute[] = [
    toAttr('runesignal.tenant_id',  row.tenant_id),
    toAttr('runesignal.event_type', row.event_type),
  ];
  if (row.agent_id)  attrs.push(toAttr('runesignal.agent_id',  row.agent_id));
  if (row.signature) attrs.push(toAttr('runesignal.signature', row.signature));

  const nano = toNano(row.created_at);
  return {
    traceId,
    spanId,
    name:              row.event_type,
    startTimeUnixNano: nano,
    endTimeUnixNano:   nano,
    attributes:        attrs,
    status:            { code: 1 },
  };
}

/**
 * Push a batch of audit events to an OTLP collector endpoint.
 * Compatible with Grafana, Datadog, Splunk OTLP ingest.
 */
export async function pushToOtlpCollector(rows: AuditEventRow[]): Promise<{ exported: number; error?: string }> {
  const endpoint = process.env.OTLP_ENDPOINT;
  if (!endpoint) return { exported: 0, error: 'OTLP_ENDPOINT not configured' };

  const logs  = rows.map(toOtlpLogRecord);
  const spans = rows.map(toOtlpSpan);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.OTLP_API_KEY) headers['Authorization'] = `Bearer ${process.env.OTLP_API_KEY}`;

  const body = JSON.stringify({
    resourceLogs: [{
      resource: { attributes: [toAttr('service.name', 'runesignal'), toAttr('service.version', '2.0')] },
      scopeLogs: [{ scope: { name: 'runesignal.audit' }, logRecords: logs }],
    }],
    resourceSpans: [{
      resource: { attributes: [toAttr('service.name', 'runesignal')] },
      scopeSpans: [{ scope: { name: 'runesignal.audit' }, spans }],
    }],
  });

  try {
    const res = await fetch(`${endpoint}/v1/logs`, { method: 'POST', headers, body });
    if (!res.ok) return { exported: 0, error: `OTLP collector responded ${res.status}` };
    return { exported: rows.length };
  } catch (err: unknown) {
    return { exported: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
