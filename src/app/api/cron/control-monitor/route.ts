/**
 * Vercel CRON Job Handler — Control Monitoring
 * GET /api/cron/control-monitor
 *
 * Runs every 15 minutes. Evaluates all scheduled controls for every tenant,
 * detects status transitions and consecutive failure thresholds, and dispatches
 * alerts via IntegrationDispatcher.
 *
 * EU AI Act Article 9 — Continuous compliance monitoring
 * ISO 42001 Clause 8.2 — Operational planning and control
 *
 * Phase 4 Task 4.1.3
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { ControlService } from '@lib/services/control-service';
import { IntegrationDispatcher } from '@lib/integrations/dispatcher';
import type { ControlStatus } from '@lib/types/control';

/** Consecutive failure thresholds that trigger alerts. */
const FAILURE_THRESHOLDS = [3, 5, 10];

interface ControlAlert {
  type: 'control_failure_alert';
  control_id: string;
  control_name: string;
  regulation: string | null;
  clause_ref: string | null;
  severity: string;
  previous_status: string;
  new_status: string;
  consecutive_failures: number;
  detail: Record<string, unknown>;
  message: string;
}

function shouldAlertOnTransition(
  previousStatus: ControlStatus,
  newStatus: ControlStatus,
): boolean {
  if (newStatus === 'failing') {
    return previousStatus === 'passing' || previousStatus === 'warning' || previousStatus === 'not_evaluated';
  }
  if (newStatus === 'warning') {
    return previousStatus === 'passing' || previousStatus === 'not_evaluated';
  }
  return false;
}

function shouldAlertOnThreshold(
  previousFailures: number,
  currentFailures: number,
): boolean {
  return FAILURE_THRESHOLDS.some(t => previousFailures < t && currentFailures >= t);
}

function buildAlertMessage(alert: Omit<ControlAlert, 'message'>): string {
  const parts: string[] = [];

  if (alert.previous_status !== alert.new_status) {
    parts.push(
      `Control "${alert.control_name}" transitioned from ${alert.previous_status} to ${alert.new_status}.`,
    );
  }

  if (FAILURE_THRESHOLDS.includes(alert.consecutive_failures)) {
    parts.push(
      `Consecutive failures reached ${alert.consecutive_failures}.`,
    );
  }

  if (alert.regulation) {
    parts.push(`Regulation: ${alert.regulation}${alert.clause_ref ? ` (${alert.clause_ref})` : ''}.`);
  }

  parts.push(`Severity: ${alert.severity}.`);

  return parts.join(' ');
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();

    // 1. Get all tenants with scheduled controls
    const { data: tenantRows, error: tenantError } = await supabase
      .from('controls')
      .select('tenant_id')
      .eq('evaluation_type', 'scheduled');

    if (tenantError) {
      console.error('[Control Monitor CRON] Tenant query error:', tenantError.message);
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    const tenantIds = [...new Set((tenantRows || []).map((r: { tenant_id: string }) => r.tenant_id))] as string[];

    let totalControlsEvaluated = 0;
    let totalAlertsSent = 0;
    const results: Array<{ tenant_id: string; controls_evaluated: number; alerts_sent: number }> = [];

    // 2. For each tenant, snapshot statuses, evaluate, detect alerts
    for (const tenantId of tenantIds) {
      // Snapshot current control statuses before evaluation
      const { data: controlsBefore } = await supabase
        .from('controls')
        .select('id, name, status, consecutive_failures, regulation, clause_ref, severity')
        .eq('tenant_id', tenantId)
        .eq('evaluation_type', 'scheduled');

      const statusMap = new Map<string, { status: ControlStatus; consecutive_failures: number }>();
      for (const c of controlsBefore || []) {
        statusMap.set(c.id as string, {
          status: c.status as ControlStatus,
          consecutive_failures: c.consecutive_failures as number,
        });
      }

      // Evaluate all scheduled controls
      const evaluations = await ControlService.evaluateAll(tenantId, 'scheduled');
      totalControlsEvaluated += evaluations.length;

      // Detect alerts
      let tenantAlerts = 0;
      for (const evaluation of evaluations) {
        const before = statusMap.get(evaluation.control_id);
        if (!before) continue;

        // Read the updated control to get new status and consecutive_failures
        const updatedControl = await ControlService.getById(tenantId, evaluation.control_id);
        if (!updatedControl) continue;

        const previousStatus = before.status;
        const newStatus = updatedControl.status;
        const previousFailures = before.consecutive_failures;
        const currentFailures = updatedControl.consecutive_failures;

        const transitionAlert = shouldAlertOnTransition(previousStatus, newStatus);
        const thresholdAlert = shouldAlertOnThreshold(previousFailures, currentFailures);

        if (!transitionAlert && !thresholdAlert) continue;

        const alertBase: Omit<ControlAlert, 'message'> = {
          type: 'control_failure_alert',
          control_id: updatedControl.id,
          control_name: updatedControl.name,
          regulation: updatedControl.regulation,
          clause_ref: updatedControl.clause_ref,
          severity: updatedControl.severity,
          previous_status: previousStatus,
          new_status: newStatus,
          consecutive_failures: currentFailures,
          detail: evaluation.detail,
        };

        const alert: ControlAlert = {
          ...alertBase,
          message: buildAlertMessage(alertBase),
        };

        // Dispatch alert via IntegrationDispatcher
        try {
          await IntegrationDispatcher.dispatchHitlCreated(tenantId, {
            id: updatedControl.id,
            tenant_id: tenantId,
            agent_id: '',
            title: `Control Alert: ${updatedControl.name}`,
            description: alert.message,
            priority: updatedControl.severity === 'critical' ? 'critical' : updatedControl.severity === 'high' ? 'high' : 'medium',
            status: 'pending',
            context_data: alert as unknown as Record<string, unknown>,
            created_at: now.toISOString(),
            sla_deadline: now.toISOString(),
          });
          tenantAlerts++;
        } catch (dispatchErr) {
          console.error(`[Control Monitor CRON] Dispatch failed for control ${updatedControl.id}:`, dispatchErr);
        }
      }

      totalAlertsSent += tenantAlerts;
      results.push({
        tenant_id: tenantId,
        controls_evaluated: evaluations.length,
        alerts_sent: tenantAlerts,
      });
    }

    console.log(
      `[Control Monitor CRON] Processed ${tenantIds.length} tenants, ` +
      `${totalControlsEvaluated} controls evaluated, ${totalAlertsSent} alerts sent.`,
    );

    return NextResponse.json({
      success: true,
      tenants_evaluated: tenantIds.length,
      controls_evaluated: totalControlsEvaluated,
      alerts_sent: totalAlertsSent,
      results,
      timestamp: now.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Control Monitor CRON] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
