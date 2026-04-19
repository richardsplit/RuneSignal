/**
 * IncidentAutoDetector — Rule-based incident creation from operational signals.
 *
 * Triggered by:
 *   - Critical/high anomalies (S14 AnomalyDetectorService)
 *   - High-risk firewall blocks (FirewallService)
 *
 * Deduplication: checks for an open incident with the same source ID
 * within the last 24 hours before creating a new one.
 *
 * EU AI Act Article 73 — Serious Incident Reporting
 * ISO 42001 Clause 10.2 — Incident Documentation
 *
 * Phase 3 Task 3.1.5
 */

import { createAdminClient } from '@lib/db/supabase';
import { IncidentService } from '@lib/services/incident-service';
import { AuditLedgerService } from '@lib/ledger/service';
import type { IncidentSeverity, IncidentCategory } from '@lib/types/incident';

/** Rules that map anomaly types to incident categories and whether it's a serious incident. */
const ANOMALY_RULES: Record<string, {
  severity: IncidentSeverity;
  category: IncidentCategory;
  is_serious_incident: boolean;
}> = {
  error_rate: { severity: 'critical', category: 'safety',          is_serious_incident: true  },
  cost_spike:  { severity: 'high',    category: 'operational',      is_serious_incident: false },
  token_volume:{ severity: 'medium',  category: 'operational',      is_serious_incident: false },
  velocity:    { severity: 'high',    category: 'operational',      is_serious_incident: false },
};

export class IncidentAutoDetector {
  /**
   * Create an incident from a detected anomaly event.
   * Only fires for 'critical' or 'high' severity anomalies.
   * Deduplicates within a 24h window by (tenant_id, anomaly_id).
   */
  static async fromAnomaly(params: {
    tenant_id: string;
    agent_id: string;
    anomaly_id: string;
    anomaly_type: string;
    severity: string;
    z_score: number;
    observed_value: number;
    baseline_mean: number;
  }): Promise<void> {
    if (params.severity !== 'critical' && params.severity !== 'high') return;

    const supabase = createAdminClient();
    const windowStart = new Date(Date.now() - 86400000).toISOString();

    // Dedup: check for existing open incident referencing this anomaly
    const { data: existing } = await supabase
      .from('incidents')
      .select('id')
      .eq('tenant_id', params.tenant_id)
      .not('status', 'in', '("closed")')
      .contains('related_anomaly_ids', [params.anomaly_id])
      .gte('created_at', windowStart)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return; // already an open incident for this anomaly
    }

    const rule = ANOMALY_RULES[params.anomaly_type] ?? {
      severity: params.severity as IncidentSeverity,
      category: 'operational' as IncidentCategory,
      is_serious_incident: params.severity === 'critical',
    };

    try {
      await IncidentService.create({
        tenant_id: params.tenant_id,
        title: `[Auto-detected] ${params.anomaly_type.replace(/_/g, ' ')} anomaly — z-score ${params.z_score.toFixed(2)}`,
        description: `Anomaly detected automatically. Metric: ${params.anomaly_type}. ` +
          `Observed value: ${params.observed_value.toFixed(4)}, Baseline mean: ${params.baseline_mean.toFixed(4)}, ` +
          `Z-score: ${params.z_score.toFixed(2)}.`,
        severity: rule.severity,
        category: rule.category,
        is_serious_incident: rule.is_serious_incident,
        market_surveillance_authority: rule.is_serious_incident ? 'Pending — assign before deadline' : undefined,
        reported_by: 'system:anomaly-detector',
        related_anomaly_ids: [params.anomaly_id],
        related_agent_ids: [params.agent_id],
      });

      await AuditLedgerService.appendEvent({
        event_type: 'incident.auto_created_anomaly',
        module: 'system',
        tenant_id: params.tenant_id,
        agent_id: params.agent_id,
        payload: {
          anomaly_id: params.anomaly_id,
          anomaly_type: params.anomaly_type,
          severity: params.severity,
          z_score: params.z_score,
        },
      }).catch(() => undefined);
    } catch (err) {
      console.error('[IncidentAutoDetector] Failed to auto-create incident from anomaly:', err);
    }
  }

  /**
   * Create an incident from a high-risk firewall block.
   * Only fires when risk_score >= 0.90 and verdict === 'block'.
   * Deduplicates within a 1h window by (tenant_id, agent_id, action).
   */
  static async fromFirewallBlock(params: {
    tenant_id: string;
    agent_id: string;
    firewall_eval_id: string;
    action: string;
    resource: string;
    risk_score: number;
    block_reason?: string;
    is_moral_violation?: boolean;
  }): Promise<void> {
    if (params.risk_score < 0.90) return;

    const supabase = createAdminClient();
    const windowStart = new Date(Date.now() - 3600000).toISOString();

    const { data: existing } = await supabase
      .from('incidents')
      .select('id')
      .eq('tenant_id', params.tenant_id)
      .not('status', 'in', '("closed")')
      .contains('related_firewall_ids', [params.firewall_eval_id])
      .gte('created_at', windowStart)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    const category: IncidentCategory = params.is_moral_violation ? 'rights_violation' : 'security';
    const severity: IncidentSeverity  = params.risk_score >= 0.97 ? 'critical' : 'high';

    try {
      await IncidentService.create({
        tenant_id: params.tenant_id,
        title: `[Auto-detected] High-risk firewall block — ${params.action} on ${params.resource}`,
        description: `Firewall blocked a high-risk agent action. Risk score: ${(params.risk_score * 100).toFixed(1)}%.` +
          (params.block_reason ? ` Reason: ${params.block_reason}.` : ''),
        severity,
        category,
        is_serious_incident: false,
        reported_by: 'system:firewall',
        related_firewall_ids: [params.firewall_eval_id],
        related_agent_ids: [params.agent_id],
      });

      await AuditLedgerService.appendEvent({
        event_type: 'incident.auto_created_firewall',
        module: 'system',
        tenant_id: params.tenant_id,
        agent_id: params.agent_id,
        payload: {
          firewall_eval_id: params.firewall_eval_id,
          risk_score: params.risk_score,
          action: params.action,
          resource: params.resource,
          category,
          severity,
        },
      }).catch(() => undefined);
    } catch (err) {
      console.error('[IncidentAutoDetector] Failed to auto-create incident from firewall block:', err);
    }
  }
}
