import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/db/supabase';
import { JIRA_PLUGIN_TEMPLATE } from '../../../../../lib/plugins/prebuilt/jira';
import { DATADOG_PLUGIN_TEMPLATE } from '../../../../../lib/plugins/prebuilt/datadog';
import { PAGERDUTY_PLUGIN_TEMPLATE } from '../../../../../lib/plugins/prebuilt/pagerduty';
import { SALESFORCE_PLUGIN_TEMPLATE } from '../../../../../lib/plugins/prebuilt/salesforce';
import { EU_REGULATORY_MONITOR_TEMPLATE } from '../../../../../lib/plugins/prebuilt/eu-regulatory-monitor';

const PREBUILT_TEMPLATES = [
  { ...JIRA_PLUGIN_TEMPLATE, id: 'prebuilt:jira' },
  { ...DATADOG_PLUGIN_TEMPLATE, id: 'prebuilt:datadog' },
  { ...PAGERDUTY_PLUGIN_TEMPLATE, id: 'prebuilt:pagerduty' },
  { ...SALESFORCE_PLUGIN_TEMPLATE, id: 'prebuilt:salesforce' },
  { ...EU_REGULATORY_MONITOR_TEMPLATE, id: 'prebuilt:eu-regulatory-monitor' },
];

/**
 * GET /api/v1/plugins
 * List all installed plugins for the tenant.
 * Query params: ?include_templates=true to also return pre-built catalog.
 *
 * POST /api/v1/plugins
 * Install a plugin (from template or custom).
 * Body: { name, plugin_type, triggers, endpoint_url, auth_header?, icon?, category?,
 *         description?, retry_count?, timeout_ms? }
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includeTemplates = searchParams.get('include_templates') === 'true';

  const supabase = createAdminClient();
  const { data: plugins, error } = await supabase
    .from('plugins')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    plugins: plugins || [],
    templates: includeTemplates ? PREBUILT_TEMPLATES : undefined,
    count: (plugins || []).length,
  });
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    name?: string;
    description?: string;
    plugin_type?: string;
    category?: string;
    triggers?: string[];
    endpoint_url?: string;
    auth_header?: string;
    icon?: string;
    retry_count?: number;
    timeout_ms?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, plugin_type, triggers, endpoint_url } = body;
  if (!name || !plugin_type || !triggers || !endpoint_url) {
    return NextResponse.json({
      error: 'Missing required: name, plugin_type, triggers[], endpoint_url'
    }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('plugins')
    .insert({
      tenant_id: tenantId,
      name,
      description: body.description || '',
      plugin_type,
      category: body.category || 'custom',
      triggers,
      endpoint_url,
      auth_header: body.auth_header || null,
      icon: body.icon || null,
      retry_count: body.retry_count ?? 3,
      timeout_ms: body.timeout_ms ?? 5000,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plugin: data }, { status: 201 });
}
