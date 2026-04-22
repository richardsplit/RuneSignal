import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * GET /api/v1/registry/passports/:id/reputation
 * Returns the signed reputation scorecard for an agent passport.
 * Publicly accessible for issued passports (no tenant auth required for public passports).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Reputation is public for public passports; otherwise requires tenant auth
  const supabase = createAdminClient();
  const { data: passport, error } = await supabase
    .from('agent_passports')
    .select('id, tenant_id, agent_id, passport_number, agent_name, agent_type, status, risk_tier, eu_ai_act_category, reputation_score, incident_count, anomaly_count, hitl_count, capabilities, framework, valid_from, valid_to, signed_at, public')
    .eq('id', id)
    .maybeSingle();

  if (error || !passport) {
    return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  }

  // For private passports, require tenant auth
  if (!passport.public) {
    const tenantId = await resolveTenantId(request);
    if (!tenantId || tenantId !== passport.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Pull verification history (last 90 days)
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data: verifications } = await supabase
    .from('passport_verifications')
    .select('result, verified_at')
    .eq('passport_id', id)
    .gte('verified_at', since90)
    .order('verified_at', { ascending: false })
    .limit(200);

  // Pull incident history from audit events (last 90 days)
  const { data: recentAnomalies } = await supabase
    .from('anomaly_events')
    .select('anomaly_type, severity, resolved_at, created_at')
    .eq('tenant_id', passport.tenant_id)
    .eq('agent_id', passport.agent_id)
    .gte('created_at', since90)
    .limit(50);

  const totalVerifications = verifications?.length ?? 0;
  const failedVerifications = verifications?.filter(v => v.result !== 'valid').length ?? 0;

  // Score breakdown
  const baseScore      = passport.reputation_score ?? 100;
  const incidentDeduct = (passport.incident_count ?? 0) * 5;
  const anomalyDeduct  = (passport.anomaly_count ?? 0) * 2;
  const computedScore  = Math.max(0, Math.min(100, baseScore - incidentDeduct - anomalyDeduct));

  const riskTierLabels: Record<string, string> = {
    prohibited:   'Prohibited',
    high_risk:    'High Risk',
    limited_risk: 'Limited Risk',
    minimal_risk: 'Minimal Risk',
    unclassified: 'Unclassified',
  };

  const scorecard = {
    passport_id:      id,
    passport_number:  passport.passport_number,
    agent_name:       passport.agent_name,
    agent_type:       passport.agent_type,
    status:           passport.status,
    framework:        passport.framework,
    risk_tier:        passport.risk_tier,
    risk_tier_label:  riskTierLabels[passport.risk_tier] ?? passport.risk_tier,
    eu_ai_act_category: passport.eu_ai_act_category,
    capabilities:     passport.capabilities ?? [],
    reputation: {
      score:           computedScore,
      score_label:     computedScore >= 90 ? 'Excellent' : computedScore >= 70 ? 'Good' : computedScore >= 50 ? 'Fair' : computedScore >= 30 ? 'Poor' : 'Critical',
      incident_count:  passport.incident_count,
      anomaly_count:   passport.anomaly_count,
      hitl_count:      passport.hitl_count,
      incident_deduct: incidentDeduct,
      anomaly_deduct:  anomalyDeduct,
    },
    verifications_90d: {
      total:    totalVerifications,
      failed:   failedVerifications,
      success_rate: totalVerifications > 0 ? Math.round(((totalVerifications - failedVerifications) / totalVerifications) * 100) : 100,
    },
    recent_anomalies: (recentAnomalies ?? []).slice(0, 10),
    valid_from:  passport.valid_from,
    valid_to:    passport.valid_to,
    signed_at:   passport.signed_at,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json({ scorecard });
}
