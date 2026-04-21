import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * POST /api/v1/evidence/packs/:id/export
 * Export a pack in a chosen regulator format: 'json' | 'eu_ai_act' | 'iso_42001' | 'nist_ai_rmf' | 'insurance'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { format?: string } = {};
  try { body = await request.json(); } catch { /* format defaults to json */ }
  const format = body.format ?? 'json';

  const supabase = createAdminClient();
  const { data: pack, error } = await supabase
    .from('evidence_packs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  if (pack.status !== 'ready') return NextResponse.json({ error: 'Pack not ready' }, { status: 409 });

  const manifest = pack.evidence_manifest as Record<string, unknown>;

  // Build regulator-specific export wrapper
  const baseExport = {
    export_id:       id,
    pack_name:       pack.pack_name,
    regulation:      pack.regulation,
    pack_type:       pack.pack_type,
    coverage_score:  pack.coverage_score,
    clauses_covered: pack.clauses_covered,
    clauses_total:   pack.clauses_total,
    manifest_hash:   pack.manifest_hash,
    signature:       pack.signature,
    signed_at:       pack.signed_at,
    signer_key_id:   pack.signer_key_id,
    date_from:       pack.date_from,
    date_to:         pack.date_to,
    generated_at:    new Date().toISOString(),
    evidence:        manifest,
  };

  let exportPayload: Record<string, unknown> = baseExport;

  if (format === 'eu_ai_act') {
    exportPayload = {
      ...baseExport,
      _format: 'EU AI Act Annex IV Technical Documentation',
      _standard: 'Regulation (EU) 2024/1689',
      _deadline: '2 August 2026',
      annex_iv_sections: {
        'Art.13 Transparency': { covered: true, evidence_sources: ['audit_events', 'agent_manifests'] },
        'Art.14 Human Oversight': { covered: (manifest as any)?.hitl_approvals?.count > 0, evidence_sources: ['hitl_approvals'] },
        'Art.17 Quality Management': { covered: true, evidence_sources: ['provenance_certs', 'anomaly_alerts'] },
        'Art.29 Deployer Obligations': { covered: true, evidence_sources: ['agent_manifests', 'policies'] },
      },
    };
  } else if (format === 'insurance') {
    const m = manifest as any;
    exportPayload = {
      ...baseExport,
      _format: 'Insurance Carrier Evidence Pack (template)',
      _carrier_note: 'Suitable for AI-liability policy underwriting',
      loss_event_sampling: {
        total_decisions:   m?.audit_events?.count ?? 0,
        anomaly_count:     m?.anomalies?.count ?? 0,
        anomaly_resolved:  m?.anomalies?.resolved ?? 0,
        hitl_escalations:  m?.hitl_approvals?.count ?? 0,
        hitl_approved:     m?.hitl_approvals?.approved ?? 0,
        coverage_score:    pack.coverage_score,
      },
    };
  }

  return NextResponse.json({ export: exportPayload, format });
}
