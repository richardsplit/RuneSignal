import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';
import crypto from 'crypto';

/**
 * GET  /api/v1/registry/passports  — list passports for tenant (+ public registry browse)
 * POST /api/v1/registry/passports  — issue a new agent passport
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const browse = searchParams.get('browse') === 'true';

  const supabase = createAdminClient();

  if (browse) {
    // Public registry browse — no auth required
    const { data, error } = await supabase
      .from('agent_passports')
      .select('id, passport_number, agent_name, agent_type, risk_tier, eu_ai_act_category, reputation_score, status, framework, capabilities, valid_from, signed_at')
      .eq('public', true)
      .eq('status', 'active')
      .order('reputation_score', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ passports: data ?? [], total: data?.length ?? 0 });
  }

  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = searchParams.get('status');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  let query = supabase
    .from('agent_passports')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ passports: data ?? [], total: data?.length ?? 0 });
}

export async function POST(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    agent_id:       string;
    agent_name:     string;
    agent_type?:    string;
    framework?:     string;
    capabilities?:  string[];
    risk_tier?:     string;
    eu_ai_act_category?: string;
    valid_days?:    number;
    public?:        boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.agent_id || !body.agent_name) {
    return NextResponse.json({ error: 'agent_id and agent_name are required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check for existing active passport
  const { data: existing } = await supabase
    .from('agent_passports')
    .select('id, passport_number')
    .eq('agent_id', body.agent_id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Active passport already exists for this agent', existing_passport: existing }, { status: 409 });
  }

  // Generate passport number: RS-XXXX-XXXX-XXXX
  const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const passportNumber = `RS-${rand()}-${rand()}-${rand()}`;

  const validFrom = new Date();
  const validTo   = body.valid_days
    ? new Date(Date.now() + body.valid_days * 86400000)
    : new Date(Date.now() + 365 * 86400000); // 1 year default

  // Sign the passport
  const sigPayload = JSON.stringify({ passport_number: passportNumber, agent_id: body.agent_id, tenant_id: tenantId, valid_from: validFrom.toISOString() });
  const signature  = crypto.createHash('sha256').update(sigPayload).digest('hex');

  const { data: passport, error } = await supabase
    .from('agent_passports')
    .insert({
      tenant_id:          tenantId,
      agent_id:           body.agent_id,
      passport_number:    passportNumber,
      status:             'active',
      agent_name:         body.agent_name,
      agent_type:         body.agent_type ?? null,
      framework:          body.framework ?? 'runesignal',
      capabilities:       body.capabilities ?? [],
      risk_tier:          body.risk_tier ?? 'unclassified',
      eu_ai_act_category: body.eu_ai_act_category ?? null,
      reputation_score:   100.0,
      signature,
      signed_at:          new Date().toISOString(),
      valid_from:         validFrom.toISOString(),
      valid_to:           validTo.toISOString(),
      public:             body.public ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ passport }, { status: 201 });
}
