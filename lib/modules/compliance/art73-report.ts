/**
 * Art73ReportGenerator — EU AI Act Article 73 Serious Incident Report
 *
 * Generates structured reports for serious AI incidents as required by
 * EU AI Act Article 73(4). Reports include incident summary, AI system
 * identification, timeline, root cause analysis, corrective actions,
 * evidence references, and Ed25519 attestation.
 *
 * Phase 3 Task 3.2.1
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createAdminClient } from '@/lib/db/supabase';
import { getLedgerSigner } from '@lib/ledger/signer';
import { AuditLedgerService } from '@lib/ledger/service';
import { IncidentService } from '@lib/services/incident-service';
import type { Incident, IncidentTimelineEntry } from '@lib/types/incident';

// ---------------------------------------------------------------------------
// Art73Report type
// ---------------------------------------------------------------------------

export interface Art73Report {
  report_metadata: {
    report_id: string;
    incident_id: string;
    tenant_id: string;
    regulation: 'eu_ai_act';
    article_ref: 'article_73';
    generated_at: string;
    reporting_deadline: string;
    market_surveillance_authority: string;
  };
  incident_summary: {
    title: string;
    description: string;
    severity: string;
    category: string;
    detected_at: string;
    investigating_since: string | null;
    mitigated_at: string | null;
  };
  ai_system_identification: {
    agents_involved: Array<{
      id: string;
      name: string;
      type: string;
      eu_ai_act_category: string;
      risk_classification: string;
    }>;
  };
  timeline: Array<{
    timestamp: string;
    event_type: string;
    description: string;
    audit_event_id?: string;
  }>;
  root_cause_analysis: {
    root_cause: string | null;
    contributing_factors: string[];
  };
  corrective_actions: Array<{
    description: string;
    owner: string;
    deadline: string;
    status: string;
  }>;
  evidence_references: Array<{
    type: 'anomaly' | 'hitl_decision' | 'firewall_block' | 'audit_event';
    id: string;
    description: string;
    verifiable: boolean;
    verification_url?: string;
  }>;
  attestation: {
    bundle_hash: string;
    signature: string;
    key_id: string;
    signed_at: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTimelineEntries(entries: IncidentTimelineEntry[]): Art73Report['timeline'] {
  return entries.map((e) => ({
    timestamp: e.created_at,
    event_type: e.event_type,
    description: typeof e.detail === 'object' && e.detail !== null
      ? JSON.stringify(e.detail)
      : String(e.detail ?? ''),
    ...(e.audit_event_id ? { audit_event_id: e.audit_event_id } : {}),
  }));
}

function extractContributingFactors(entries: IncidentTimelineEntry[]): string[] {
  const factors: string[] = [];
  for (const e of entries) {
    if (e.event_type === 'status_changed' && e.detail) {
      const detail = e.detail as Record<string, unknown>;
      if (detail.reason && typeof detail.reason === 'string') {
        factors.push(detail.reason);
      }
    }
    if (e.event_type === 'evidence_attached' && e.detail) {
      const detail = e.detail as Record<string, unknown>;
      if (detail.description && typeof detail.description === 'string') {
        factors.push(detail.description);
      }
    }
  }
  return factors;
}

function buildEvidenceReferences(
  entries: IncidentTimelineEntry[],
  incident: Incident,
): Art73Report['evidence_references'] {
  const refs: Art73Report['evidence_references'] = [];

  // Evidence from timeline entries
  for (const e of entries) {
    if (e.event_type === 'evidence_attached' && e.detail) {
      const detail = e.detail as Record<string, unknown>;
      const entityId = (detail.entity_id ?? detail.id ?? e.id) as string;
      const entityType = (detail.entity_type ?? detail.type ?? 'audit_event') as string;

      let type: Art73Report['evidence_references'][0]['type'] = 'audit_event';
      if (entityType.includes('anomaly')) type = 'anomaly';
      else if (entityType.includes('hitl')) type = 'hitl_decision';
      else if (entityType.includes('firewall')) type = 'firewall_block';

      const verifiable = !!e.audit_event_id;
      refs.push({
        type,
        id: entityId,
        description: (detail.description as string) || `Evidence: ${entityType}`,
        verifiable,
        ...(verifiable ? { verification_url: `/api/v1/provenance/verify/${e.audit_event_id}` } : {}),
      });
    }
  }

  // Linked anomaly IDs
  for (const aid of incident.related_anomaly_ids ?? []) {
    if (!refs.some((r) => r.id === aid)) {
      refs.push({
        type: 'anomaly',
        id: aid,
        description: `Linked anomaly event`,
        verifiable: false,
      });
    }
  }

  // Linked HITL IDs
  for (const hid of incident.related_hitl_ids ?? []) {
    if (!refs.some((r) => r.id === hid)) {
      refs.push({
        type: 'hitl_decision',
        id: hid,
        description: `Linked HITL decision`,
        verifiable: false,
      });
    }
  }

  return refs;
}

function signReport(
  reportWithoutAttestation: Omit<Art73Report, 'attestation'>,
): Art73Report['attestation'] {
  const bundleHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(reportWithoutAttestation))
    .digest('hex');

  const signer = getLedgerSigner();
  const signature = signer.sign(Buffer.from(bundleHash));
  const keyId = process.env.ATP_SIGNING_KEY_ID || 'key_default';

  return {
    bundle_hash: bundleHash,
    signature,
    key_id: keyId,
    signed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Art73ReportGenerator
// ---------------------------------------------------------------------------

export class Art73ReportGenerator {
  /**
   * Generate an Article 73 serious incident report.
   * Aggregates data from incidents, timeline, agent registry, audit events.
   * Signs with Ed25519 (reuses LedgerSigner pattern from EvidenceService).
   * Stores in compliance_reports with report_type: 'ART73'.
   */
  static async generate(tenant_id: string, incident_id: string): Promise<Art73Report> {
    const supabase = createAdminClient();

    // 1. Load incident
    const incident = await IncidentService.getById(tenant_id, incident_id);
    if (!incident) {
      throw new Error(`Incident not found: ${incident_id}`);
    }
    if (!incident.is_serious_incident) {
      throw new Error(
        `Incident ${incident_id} is not marked as a serious incident. ` +
        `Article 73 reports can only be generated for serious incidents.`,
      );
    }

    // 2. Load timeline
    const timeline = await IncidentService.getTimeline(incident_id);

    // 3. Load agent info from agent_inventory (has eu_ai_act_category + risk_classification)
    const agentIds = incident.related_agent_ids ?? [];
    const agentsInvolved: Art73Report['ai_system_identification']['agents_involved'] = [];

    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('agent_inventory')
        .select('id, name, framework, eu_ai_act_category, risk_classification')
        .eq('org_id', tenant_id)
        .in('id', agentIds);

      if (agents && agents.length > 0) {
        for (const a of agents) {
          agentsInvolved.push({
            id: a.id,
            name: a.name || 'Unknown Agent',
            type: a.framework || 'unknown',
            eu_ai_act_category: a.eu_ai_act_category || 'high_risk',
            risk_classification: a.risk_classification || 'high',
          });
        }
      }

      // Agents referenced but not found in inventory — include with defaults
      for (const aid of agentIds) {
        if (!agentsInvolved.some((a) => a.id === aid)) {
          agentsInvolved.push({
            id: aid,
            name: 'Unregistered Agent',
            type: 'unknown',
            eu_ai_act_category: 'high_risk',
            risk_classification: 'high',
          });
        }
      }
    }

    // 4. Build report (without attestation)
    const reportId = uuidv4();
    const now = new Date().toISOString();

    const reportBody: Omit<Art73Report, 'attestation'> = {
      report_metadata: {
        report_id: reportId,
        incident_id: incident.id,
        tenant_id,
        regulation: 'eu_ai_act',
        article_ref: 'article_73',
        generated_at: now,
        reporting_deadline: incident.art73_report_deadline || '',
        market_surveillance_authority: incident.market_surveillance_authority || 'Not specified',
      },
      incident_summary: {
        title: incident.title,
        description: incident.description || '',
        severity: incident.severity,
        category: incident.category,
        detected_at: incident.detected_at,
        investigating_since: incident.investigating_since,
        mitigated_at: incident.mitigated_at,
      },
      ai_system_identification: {
        agents_involved: agentsInvolved,
      },
      timeline: buildTimelineEntries(timeline),
      root_cause_analysis: {
        root_cause: incident.root_cause,
        contributing_factors: extractContributingFactors(timeline),
      },
      corrective_actions: (incident.corrective_actions ?? []).map((ca) => ({
        description: ca.description,
        owner: ca.owner,
        deadline: ca.deadline,
        status: ca.status,
      })),
      evidence_references: buildEvidenceReferences(timeline, incident),
    };

    // 5. Sign with Ed25519
    const attestation = signReport(reportBody);
    const report: Art73Report = { ...reportBody, attestation };

    // 6. Store in compliance_reports
    const { data: reportRecord, error: insertError } = await supabase
      .from('compliance_reports')
      .insert({
        org_id: tenant_id,
        report_type: 'ART73',
        regulation: 'eu_ai_act',
        status: 'ready',
        json_export: report as unknown as Record<string, unknown>,
        evidence_period_start: incident.detected_at,
        evidence_period_end: now,
        coverage_score: 100,
        article_coverage: { article_73: 'covered' },
        version: 1,
        attestation_signature: attestation.signature,
        attestation_key_id: attestation.key_id,
        generated_by: 'system',
        generated_at: now,
      })
      .select()
      .single();

    if (insertError || !reportRecord) {
      throw new Error(`Failed to store Art73 report: ${insertError?.message ?? 'unknown error'}`);
    }

    // 7. Update incident with report link + timeline entry
    await supabase
      .from('incidents')
      .update({
        art73_report_id: reportRecord.id,
        updated_at: now,
      })
      .eq('id', incident_id)
      .eq('tenant_id', tenant_id);

    // Transition to 'reported' if currently 'mitigated'
    if (incident.status === 'mitigated') {
      try {
        await IncidentService.transition(tenant_id, incident_id, 'reported', 'system:art73', {
          art73_report_id: reportRecord.id,
        });
      } catch {
        // Transition may not be valid from current state — non-fatal
      }
    }

    // Add timeline entry
    await IncidentService.addTimelineEntry(incident_id, 'art73_report_generated', 'system:art73', {
      report_id: reportRecord.id,
      compliance_report_id: reportRecord.id,
      generated_at: now,
    });

    // 8. Audit event
    await AuditLedgerService.appendEvent({
      event_type: 'incident.art73_report_generated',
      module: 'system',
      tenant_id,
      request_id: incident_id,
      payload: {
        incident_id,
        report_id: reportRecord.id,
        bundle_hash: attestation.bundle_hash,
      },
    });

    return report;
  }

  /**
   * Retrieve the latest Art73 report for an incident.
   */
  static async getByIncidentId(
    tenant_id: string,
    incident_id: string,
  ): Promise<Art73Report | null> {
    const supabase = createAdminClient();

    // Check incident and get its art73_report_id
    const incident = await IncidentService.getById(tenant_id, incident_id);
    if (!incident || !incident.art73_report_id) return null;

    const { data, error } = await supabase
      .from('compliance_reports')
      .select('json_export')
      .eq('id', incident.art73_report_id)
      .eq('org_id', tenant_id)
      .single();

    if (error || !data) return null;

    return data.json_export as unknown as Art73Report;
  }
}
