import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '../../../../../../../lib/ledger/service';

/**
 * POST /api/v1/soul-templates/:id/activate
 * Activate a SOUL template for the tenant.
 * Free templates activate immediately.
 * Paid templates require pro/enterprise plan.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('soul_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Check if already activated
  const { data: existing } = await supabase
    .from('soul_activations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('template_id', id)
    .eq('is_active', true)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Template already activated' }, { status: 409 });
  }

  // Check plan gating for paid templates
  if (template.price_usd > 0) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    const plan = tenant?.plan || 'free';
    if (!['pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({
        error: 'Paid SOUL templates require a Pro or Enterprise plan',
        upgrade_url: '/account-settings/billing',
        price_usd: template.price_usd,
      }, { status: 402 });
    }
  }

  // Activate
  const { data: activation, error: activationError } = await supabase
    .from('soul_activations')
    .insert({
      tenant_id: tenantId,
      template_id: id,
      soul_config: template.soul_config,
      is_active: true,
    })
    .select()
    .single();

  if (activationError) return NextResponse.json({ error: activationError.message }, { status: 500 });

  // Audit log
  await AuditLedgerService.appendEvent({
    event_type: 'soul.template.activated',
    module: 'system',
    tenant_id: tenantId,
    payload: {
      template_id: id,
      template_name: template.name,
      price_usd: template.price_usd,
    },
  });

  return NextResponse.json({ activation, template }, { status: 201 });
}

/**
 * DELETE /api/v1/soul-templates/:id/activate
 * Deactivate a SOUL template for the tenant.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('soul_activations')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('template_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
