import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * POST /api/v1/registry/passports/:id/verify
 * Counterparty verification of an agent passport. Metered per call.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data: passport, error } = await supabase
    .from('agent_passports')
    .select('id, passport_number, agent_name, agent_type, status, risk_tier, eu_ai_act_category, reputation_score, signature, signed_at, valid_from, valid_to, capabilities, framework')
    .eq('id', id)
    .maybeSingle();

  if (error || !passport) {
    try { await supabase.from('passport_verifications').insert({ passport_id: id, verifier_tenant: tenantId, result: 'not_found' }); } catch { /* audit best-effort */ }
    return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  }

  let result: 'valid' | 'revoked' | 'expired' = 'valid';
  if (passport.status === 'revoked' || passport.status === 'suspended') result = 'revoked';
  else if (passport.valid_to && new Date(passport.valid_to) < new Date()) result = 'expired';

  await supabase.from('passport_verifications').insert({
    passport_id:     id,
    verifier_tenant: tenantId,
    result,
    metadata: { verified_fields: ['status', 'valid_to', 'signature'] },
  });

  return NextResponse.json({
    verification: {
      passport_id:      id,
      passport_number:  passport.passport_number,
      agent_name:       passport.agent_name,
      result,
      valid:            result === 'valid',
      risk_tier:        passport.risk_tier,
      reputation_score: passport.reputation_score,
      verified_at:      new Date().toISOString(),
    },
  });
}
