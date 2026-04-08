/**
 * TrustLayer SIEM Exporter
 *
 * Queries the audit_events table and pushes events to configured SIEM endpoints.
 * Supports both push (real-time) and pull (polling) patterns.
 * Formats events as JSON (Elastic/Datadog) or CEF (Splunk/QRadar).
 */

import { createAdminClient } from '../../db/supabase';
import { formatAsJSON, formatBatchAsJSONL } from './formatters/json';
import { formatAsCEF, formatBatchAsCEF } from './formatters/cef';

export interface SIEMExportResult {
  events_exported: number;
  endpoints_notified: number;
  errors: string[];
}

export class SIEMExporter {
  /**
   * Exports recent audit events for a tenant to all configured SIEM endpoints.
   * Called from the cron job or triggered after each audit ledger write.
   */
  static async exportEvents(
    tenantId: string,
    options: { since?: string; limit?: number } = {}
  ): Promise<SIEMExportResult> {
    const supabase = createAdminClient();
    const errors: string[] = [];

    // Fetch active SIEM endpoints for this tenant
    const { data: endpoints } = await supabase
      .from('siem_endpoints')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (!endpoints || endpoints.length === 0) {
      return { events_exported: 0, endpoints_notified: 0, errors: [] };
    }

    // Fetch events since the last push
    const since = options.since || new Date(Date.now() - 5 * 60 * 1000).toISOString(); // last 5 min
    const limit = options.limit || 500;

    let query = supabase
      .from('audit_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(limit);

    const { data: events } = await query;
    if (!events || events.length === 0) {
      return { events_exported: 0, endpoints_notified: endpoints.length, errors: [] };
    }

    let endpointsNotified = 0;

    // Push to each endpoint
    await Promise.allSettled(
      endpoints.map(async ep => {
        try {
          // Filter events if event_filter is configured
          let filteredEvents = events;
          if (ep.event_filter && ep.event_filter.length > 0) {
            filteredEvents = events.filter(e =>
              ep.event_filter.some((filter: string) => {
                if (filter.endsWith('*')) {
                  return (e.event_type as string).startsWith(filter.slice(0, -1));
                }
                return e.event_type === filter;
              })
            );
          }

          if (filteredEvents.length === 0) return;

          let body: string;
          let contentType: string;

          if (ep.format === 'cef') {
            body = formatBatchAsCEF(filteredEvents);
            contentType = 'text/plain';
          } else {
            body = formatBatchAsJSONL(filteredEvents);
            contentType = 'application/x-ndjson';
          }

          const headers: Record<string, string> = {
            'Content-Type': contentType,
            'X-TrustLayer-Export': 'audit-events',
            'X-Event-Count': String(filteredEvents.length),
          };

          if (ep.auth_header) {
            const [key, ...rest] = (ep.auth_header as string).split(':');
            headers[key.trim()] = rest.join(':').trim();
          }

          const response = await fetch(ep.endpoint_url as string, {
            method: 'POST',
            headers,
            body,
          });

          if (!response.ok) {
            errors.push(`Endpoint ${ep.id}: HTTP ${response.status}`);
            return;
          }

          // Update last_push_at
          await supabase
            .from('siem_endpoints')
            .update({ last_push_at: new Date().toISOString() })
            .eq('id', ep.id);

          endpointsNotified++;
        } catch (e: any) {
          errors.push(`Endpoint ${ep.id}: ${e.message}`);
        }
      })
    );

    return {
      events_exported: events.length,
      endpoints_notified: endpointsNotified,
      errors,
    };
  }

  /**
   * Pulls events for a given tenant in the requested format.
   * Used for the polling endpoint (/api/v1/siem/export).
   */
  static async pullEvents(
    tenantId: string,
    format: 'json' | 'cef' = 'json',
    options: { since?: string; limit?: number; event_types?: string[] } = {}
  ): Promise<string> {
    const supabase = createAdminClient();
    const since = options.since || new Date(Date.now() - 60 * 60 * 1000).toISOString(); // last hour
    const limit = Math.min(options.limit || 1000, 5000);

    let query = supabase
      .from('audit_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(limit);

    const { data: events } = await query;
    if (!events || events.length === 0) return '';

    let filtered = events;
    if (options.event_types && options.event_types.length > 0) {
      filtered = events.filter(e => options.event_types!.includes(e.event_type as string));
    }

    return format === 'cef' ? formatBatchAsCEF(filtered) : formatBatchAsJSONL(filtered);
  }
}
