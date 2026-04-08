import { NextRequest, NextResponse } from 'next/server';
import { SIEMExporter } from '../../../../../../lib/integrations/siem/exporter';

/**
 * GET /api/v1/siem/export
 * Pull-based SIEM export — returns recent audit events in JSON or CEF format.
 *
 * Query params:
 *   format=json|cef         (default: json)
 *   since=ISO_DATE          (default: last hour)
 *   limit=number            (default: 1000, max: 5000)
 *   event_types=a,b,c       (optional filter)
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'json') as 'json' | 'cef';
  const since = searchParams.get('since') || undefined;
  const limit = parseInt(searchParams.get('limit') || '1000');
  const eventTypesRaw = searchParams.get('event_types');
  const eventTypes = eventTypesRaw ? eventTypesRaw.split(',').map(s => s.trim()) : undefined;

  if (!['json', 'cef'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format. Use "json" or "cef".' }, { status: 400 });
  }

  try {
    const content = await SIEMExporter.pullEvents(tenantId, format, { since, limit, event_types: eventTypes });

    const contentType = format === 'cef' ? 'text/plain' : 'application/x-ndjson';
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'X-Export-Format': format,
        'X-TrustLayer-Export': 'audit-events',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/siem/export
 * Trigger an immediate push export to all configured SIEM endpoints.
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = await SIEMExporter.exportEvents(tenantId, {
    since: body.since,
    limit: body.limit,
  });

  return NextResponse.json(result);
}
