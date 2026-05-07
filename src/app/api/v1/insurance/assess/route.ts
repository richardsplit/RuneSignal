import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';
import crypto from 'crypto';

/**
 * POST /api/v1/insurance/assess
 * S5 Insurance State Machine — actuarial risk-scoring engine.
 *
 * Takes { agentId, actionHistory?, blastRadiusScore? } and returns a signed
 * InsuranceAssessment with risk tier, recommended coverage limit, and evidence citations.
 *
 * EU AI Act Article 9 (risk management) + Article 17 (QMS in insurance context).
 * T-I OEM tier — FEATURE_INSURANCE_OEM gate removed when first carrier is onboarded.
 */
export async function POST(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    agentId:           string;
    actionHistory?:    Array<{ event_type: string; outcome?: string; anomaly?: boolean; severity?: string }>;
    blastRadiusScore?: number;
    period_days?:      number;
    carrier?:          string;
  };

  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });

  const supabase   = createAdminClient();
  const periodDays = body.period_days ?? 90;
  const since      = new Date(Date.now() - periodDays * 86400000).toISOString();

  // Pull live data from audit ledger, anomaly engine, incidents, HITL, reversals
  const [auditRes, anomalyRes, incidentRes, hitlRes, reversalRes, outcomeRes, passportRes] = await Promise.all([
    supabase.from('audit_events').select('id, event_type, action', { count: 'exact' }).eq('tenant_id', tenantId).eq('agent_id', body.agentId).gte('created_at', since).limit(1),
    supabase.from('anomaly_events').select('id, severity, anomaly_type', { count: 'exact' }).eq('tenant_id', tenantId).eq('agent_id', body.agentId).gte('created_at', since).limit(50),
    supabase.from('incidents').select('id, severity, is_serious_incident, status').eq('tenant_id', tenantId).eq('agent_id', body.agentId).gte('created_at', since),
    supabase.from('approval_requests').select('id, status', { count: 'exact' }).eq('tenant_id', tenantId).eq('agent_id', body.agentId).gte('created_at', since).limit(1),
    supabase.from('decision_reversals').select('id, reversal_type, status').eq('tenant_id', tenantId).gte('created_at', since).limit(100),
    supabase.from('decision_outcomes').select('id, outcome_status').eq('tenant_id', tenantId).gte('labeled_at', since).limit(200),
    supabase.from('agent_passports').select('passport_number, risk_tier, reputation_score, status').eq('tenant_id', tenantId).eq('agent_id', body.agentId).maybeSingle(),
  ]);

  const totalActions    = auditRes.count ?? 0;
  const anomalies       = anomalyRes.data ?? [];
  const incidents       = incidentRes.data ?? [];
  const totalHitl       = hitlRes.count ?? 0;
  const reversals       = reversalRes.data ?? [];
  const outcomes        = outcomeRes.data ?? [];
  const passport        = passportRes.data;

  // ── Actuarial scoring model ────────────────────────────────────────────────
  let riskPoints = 0;

  // Blast radius (0–100 from S4)
  const blastRadius = body.blastRadiusScore ?? 30;
  riskPoints += Math.floor(blastRadius * 0.3);

  // Anomaly rate
  const anomalyRate = totalActions > 0 ? anomalies.length / totalActions : 0;
  riskPoints += Math.floor(anomalyRate * 200);

  // Critical anomalies (5 pts each)
  riskPoints += anomalies.filter(a => a.severity === 'critical').length * 5;

  // Serious incidents (15 pts each)
  const seriousIncidents = incidents.filter(i => i.is_serious_incident);
  riskPoints += seriousIncidents.length * 15;

  // Reversals (3 pts each)
  riskPoints += reversals.filter(r => r.status === 'completed').length * 3;

  // Litigated outcomes (20 pts each)
  riskPoints += outcomes.filter(o => o.outcome_status === 'litigated').length * 20;

  // HITL coverage reduces risk
  const hitlCoverage = totalActions > 0 ? totalHitl / totalActions : 0;
  riskPoints -= Math.floor(hitlCoverage * 20);

  // Passport reputation score reduces risk
  if (passport?.reputation_score) riskPoints -= Math.floor((passport.reputation_score / 100) * 15);

  // Clamp 0–100
  riskPoints = Math.max(0, Math.min(100, riskPoints));

  // ── Risk tier classification ───────────────────────────────────────────────
  type RiskTier = 'Low' | 'Medium' | 'High' | 'Uninsurable';
  const riskTier: RiskTier =
    riskPoints >= 80 ? 'Uninsurable' :
    riskPoints >= 55 ? 'High'        :
    riskPoints >= 30 ? 'Medium'      : 'Low';

  // ── Coverage recommendation (EUR) ─────────────────────────────────────────
  const coverageMap: Record<RiskTier, string> = {
    Low:         '€100,000 — €500,000',
    Medium:      '€500,000 — €2,000,000',
    High:        '€2,000,000 — €10,000,000',
    Uninsurable: 'Not eligible — remediation required',
  };

  // ── Evidence citations ────────────────────────────────────────────────────
  const evidenceCitations: string[] = [];
  if (totalActions > 0)             evidenceCitations.push(`${totalActions} audit events in last ${periodDays}d (S3 ledger)`);
  if (anomalies.length > 0)         evidenceCitations.push(`${anomalies.length} anomalies detected (S8)`);
  if (seriousIncidents.length > 0)  evidenceCitations.push(`${seriousIncidents.length} serious incidents (Art.73)`);
  if (totalHitl > 0)                evidenceCitations.push(`${totalHitl} HITL escalations, coverage ${(hitlCoverage * 100).toFixed(1)}% (S7)`);
  if (reversals.length > 0)         evidenceCitations.push(`${reversals.length} decision reversals recorded (T3)`);
  if (passport)                     evidenceCitations.push(`Passport ${passport.passport_number} — rep. score ${passport.reputation_score} (T4)`);

  const assessment = {
    agent_id:               body.agentId,
    tenant_id:              tenantId,
    carrier:                body.carrier ?? 'General',
    period_days:            periodDays,
    risk_score:             riskPoints,
    risk_tier:              riskTier,
    recommended_coverage:   coverageMap[riskTier],
    evidence_citations:     evidenceCitations,
    scoring_breakdown: {
      blast_radius_contribution: Math.floor(blastRadius * 0.3),
      anomaly_contribution:      Math.floor(anomalyRate * 200),
      incident_contribution:     seriousIncidents.length * 15,
      reversal_contribution:     reversals.filter(r => r.status === 'completed').length * 3,
      litigation_contribution:   outcomes.filter(o => o.outcome_status === 'litigated').length * 20,
      hitl_reduction:            Math.floor(hitlCoverage * 20),
      passport_reduction:        passport ? Math.floor((passport.reputation_score / 100) * 15) : 0,
    },
    eu_ai_act_ref:    'Article 9, Article 17',
    generated_at:     new Date().toISOString(),
  };

  const manifestHash = crypto.createHash('sha256').update(JSON.stringify(assessment)).digest('hex');
  const signature    = crypto.createHash('sha256').update(`${manifestHash}:${tenantId}:insurance_assess`).digest('hex');

  return NextResponse.json({
    assessment: { ...assessment, manifest_hash: manifestHash, signature },
  }, { status: 201 });
}

/**
 * GET /api/v1/insurance/assess?agentId=xxx
 * Quick risk summary for an agent without storing a full assessment.
 */
export async function GET(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId query param required' }, { status: 400 });

  const supabase = createAdminClient();
  const since    = new Date(Date.now() - 90 * 86400000).toISOString();

  const [anomalyRes, incidentRes] = await Promise.all([
    supabase.from('anomaly_events').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('agent_id', agentId).gte('created_at', since).limit(1),
    supabase.from('incidents').select('id, is_serious_incident').eq('tenant_id', tenantId).eq('agent_id', agentId).gte('created_at', since),
  ]);

  const seriousCount = incidentRes.data?.filter(i => i.is_serious_incident).length ?? 0;
  const quickScore   = Math.min(100, (anomalyRes.count ?? 0) * 2 + seriousCount * 15);
  const quickTier    = quickScore >= 80 ? 'Uninsurable' : quickScore >= 55 ? 'High' : quickScore >= 30 ? 'Medium' : 'Low';

  return NextResponse.json({ agent_id: agentId, quick_risk_score: quickScore, quick_risk_tier: quickTier });
}
