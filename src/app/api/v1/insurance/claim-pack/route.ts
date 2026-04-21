import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';
import crypto from 'crypto';

/**
 * POST /api/v1/insurance/claim-pack
 * Generate a carrier-ready insurance evidence pack (Munich Re / Lloyd's template).
 * Different from regulator pack: focuses on loss-event sampling, reversal history, and anomaly rates.
 */
export async function POST(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    date_from?:    string;
    date_to?:      string;
    agent_ids?:    string[];
    carrier?:      string;
    claim_ref?:    string;
    created_by?:   string;
  } = {};
  try { body = await request.json(); } catch { /* defaults */ }

  const supabase = createAdminClient();
  const dateFrom = body.date_from ? new Date(body.date_from) : new Date(Date.now() - 90 * 86400000);
  const dateTo   = body.date_to   ? new Date(body.date_to)   : new Date();

  // Pull data for insurance sampling
  const [auditRes, anomalyRes, hitlRes, incidentRes, reversalRes, outcomeRes] = await Promise.all([
    supabase.from('audit_events').select('request_id, event_type, agent_id, created_at').eq('tenant_id', tenantId).gte('created_at', dateFrom.toISOString()).lte('created_at', dateTo.toISOString()).limit(2000),
    supabase.from('anomaly_events').select('id, anomaly_type, severity, resolved_at, created_at').eq('tenant_id', tenantId).gte('created_at', dateFrom.toISOString()).lte('created_at', dateTo.toISOString()).limit(500),
    supabase.from('approval_requests').select('id, status, priority, created_at').eq('tenant_id', tenantId).gte('created_at', dateFrom.toISOString()).lte('created_at', dateTo.toISOString()).limit(500),
    supabase.from('incidents').select('id, severity, category, status, is_serious_incident, created_at').eq('tenant_id', tenantId).gte('created_at', dateFrom.toISOString()).lte('created_at', dateTo.toISOString()).limit(200),
    supabase.from('decision_reversals').select('id, reversal_type, status, created_at').eq('tenant_id', tenantId).gte('created_at', dateFrom.toISOString()).lte('created_at', dateTo.toISOString()).limit(200),
    supabase.from('decision_outcomes').select('id, outcome_status, outcome_source, labeled_at').eq('tenant_id', tenantId).gte('labeled_at', dateFrom.toISOString()).lte('labeled_at', dateTo.toISOString()).limit(500),
  ]);

  const audit     = auditRes.data ?? [];
  const anomalies = anomalyRes.data ?? [];
  const hitl      = hitlRes.data ?? [];
  const incidents = incidentRes.data ?? [];
  const reversals = reversalRes.data ?? [];
  const outcomes  = outcomeRes.data ?? [];

  const totalDecisions     = audit.length;
  const anomalyRate        = totalDecisions > 0 ? ((anomalies.length / totalDecisions) * 100).toFixed(2) : '0.00';
  const hitlCoverageRate   = totalDecisions > 0 ? ((hitl.filter(h => h.status === 'approved').length / Math.max(totalDecisions, 1)) * 100).toFixed(2) : '0.00';
  const seriousIncidents   = incidents.filter(i => i.is_serious_incident).length;
  const reversedDecisions  = reversals.filter(r => r.status === 'completed').length;
  const litigatedOutcomes  = outcomes.filter(o => o.outcome_status === 'litigated').length;

  const manifest = {
    carrier:                body.carrier ?? 'General',
    claim_ref:              body.claim_ref ?? null,
    tenant_id:              tenantId,
    date_from:              dateFrom.toISOString(),
    date_to:                dateTo.toISOString(),
    total_decisions:        totalDecisions,
    anomaly_count:          anomalies.length,
    anomaly_rate_pct:       parseFloat(anomalyRate),
    anomaly_resolved:       anomalies.filter(a => a.resolved_at).length,
    hitl_escalations:       hitl.length,
    hitl_approved:          hitl.filter(h => h.status === 'approved').length,
    hitl_coverage_rate_pct: parseFloat(hitlCoverageRate),
    incident_count:         incidents.length,
    serious_incident_count: seriousIncidents,
    critical_incidents:     incidents.filter(i => i.severity === 'critical').length,
    reversed_decisions:     reversedDecisions,
    litigated_outcomes:     litigatedOutcomes,
    outcome_labels: {
      accepted:  outcomes.filter(o => o.outcome_status === 'accepted').length,
      rejected:  outcomes.filter(o => o.outcome_status === 'rejected').length,
      reversed:  outcomes.filter(o => o.outcome_status === 'reversed').length,
      litigated: litigatedOutcomes,
      settled:   outcomes.filter(o => o.outcome_status === 'settled').length,
    },
    generated_at: new Date().toISOString(),
  };

  const manifestHash = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const signature    = crypto.createHash('sha256').update(`${manifestHash}:${tenantId}:insurance`).digest('hex');

  // Save as an evidence pack of type insurance
  const { data: pack, error } = await supabase
    .from('evidence_packs')
    .insert({
      tenant_id:         tenantId,
      pack_name:         `Insurance Carrier Pack — ${body.carrier ?? 'General'} — ${new Date().toLocaleDateString('en-GB')}`,
      regulation:        'insurance',
      pack_type:         'insurance',
      status:            'ready',
      coverage_score:    Math.max(0, 100 - (anomalies.length * 2) - (seriousIncidents * 10)),
      agent_ids:         body.agent_ids ?? [],
      date_from:         dateFrom.toISOString(),
      date_to:           dateTo.toISOString(),
      manifest_hash:     manifestHash,
      signature,
      signed_at:         new Date().toISOString(),
      signer_key_id:     'runesignal-ed25519-v1',
      evidence_manifest: manifest,
      gaps:              [],
      template_id:       'munich_re_insurance',
      created_by:        body.created_by ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pack, manifest }, { status: 201 });
}
