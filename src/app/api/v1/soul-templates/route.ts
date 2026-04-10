import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/db/supabase';

/**
 * GET /api/v1/soul-templates
 * Returns the SOUL template catalog.
 * If X-Tenant-Id is provided, also returns which templates are activated.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const supabase = createAdminClient();

  const { data: templates, error } = await supabase
    .from('soul_templates')
    .select('*')
    .order('price_usd', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let activatedIds: string[] = [];
  if (tenantId) {
    const { data: activations } = await supabase
      .from('soul_activations')
      .select('template_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);
    activatedIds = (activations || []).map(a => a.template_id);
  }

  const enriched = (templates || []).map(t => ({
    ...t,
    is_activated: activatedIds.includes(t.id),
  }));

  return NextResponse.json({ templates: enriched, count: enriched.length });
}
