/**
 * Vercel CRON Job Handler — Article 73 Deadline Tracking
 * GET /api/cron/art73-deadlines
 *
 * Runs daily. Queries serious incidents with approaching Art 73 reporting
 * deadlines and dispatches alerts via IntegrationDispatcher.
 * Escalates to incident commander if deadline is within 48 hours and
 * no report has been generated.
 *
 * EU AI Act Article 73 — 15-day reporting deadline for serious incidents.
 *
 * Phase 3 Task 3.2.2
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { IntegrationDispatcher } from '@lib/integrations/dispatcher';
import { AuditLedgerService } from '@lib/ledger/service';

type AlertLevel = 'critical' | 'urgent' | 'warning' | 'notice';

interface DeadlineAlert {
  type: 'art73_deadline_alert';
  level: AlertLevel;
  incident_id: string;
  incident_title: string;
  deadline: string;
  days_remaining: number;
  report_generated: boolean;
  incident_commander: string | null;
  message: string;
}

function classifyAlert(daysRemaining: number): AlertLevel | null {
  if (daysRemaining <= 1) return 'critical';
  if (daysRemaining <= 2) return 'urgent';
  if (daysRemaining <= 3) return 'warning';
  if (daysRemaining <= 5) return 'notice';
  return null;
}

function buildMessage(alert: Omit<DeadlineAlert, 'message'>): string {
  const deadlineDate = new Date(alert.deadline).toISOString().split('T')[0];
  const base = `[${alert.level.toUpperCase()}] Art 73 deadline for "${alert.incident_title}" ` +
    `is ${deadlineDate} (${alert.days_remaining} day${alert.days_remaining !== 1 ? 's' : ''} remaining).`;

  if (!alert.report_generated && alert.days_remaining <= 2) {
    return base + ' No report has been generated — escalation required.';
  }
  if (alert.report_generated) {
    return base + ' Report has been generated.';
  }
  return base;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const fiveDaysFromNow = new Date(now);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    // Query serious incidents with deadlines within 5 days, not yet reported/closed
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('id, tenant_id, title, art73_report_deadline, art73_report_id, incident_commander, status')
      .eq('is_serious_incident', true)
      .not('status', 'in', '("reported","closed")')
      .not('art73_report_deadline', 'is', null)
      .lte('art73_report_deadline', fiveDaysFromNow.toISOString());

    if (error) {
      console.error('[Art73 Deadline CRON] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const alerts: DeadlineAlert[] = [];
    let escalationCount = 0;

    for (const inc of incidents ?? []) {
      const deadlineDate = new Date(inc.art73_report_deadline);
      const msRemaining = deadlineDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      const level = classifyAlert(daysRemaining);
      if (!level) continue;

      const reportGenerated = !!inc.art73_report_id;

      const alertBase = {
        type: 'art73_deadline_alert' as const,
        level,
        incident_id: inc.id,
        incident_title: inc.title,
        deadline: inc.art73_report_deadline,
        days_remaining: daysRemaining,
        report_generated: reportGenerated,
        incident_commander: inc.incident_commander,
      };

      const alert: DeadlineAlert = {
        ...alertBase,
        message: buildMessage(alertBase),
      };

      alerts.push(alert);

      // Dispatch via IntegrationDispatcher as an HITL-like notification
      // The dispatcher sends to all active channels for the tenant
      try {
        await IntegrationDispatcher.dispatchHitlCreated(inc.tenant_id, {
          id: inc.id,
          tenant_id: inc.tenant_id,
          agent_id: '',
          title: `Art 73 Deadline: ${inc.title}`,
          description: alert.message,
          priority: level === 'critical' ? 'critical' : level === 'urgent' ? 'high' : 'medium',
          status: 'pending',
          context_data: { alert_type: 'art73_deadline', level, days_remaining: daysRemaining },
          created_at: now.toISOString(),
          sla_deadline: inc.art73_report_deadline,
        });
      } catch (dispatchErr) {
        console.error(`[Art73 Deadline CRON] Dispatch failed for ${inc.id}:`, dispatchErr);
      }

      // Escalate if deadline within 48 hours and no report generated
      if (daysRemaining <= 2 && !reportGenerated && inc.incident_commander) {
        escalationCount++;
        await AuditLedgerService.appendEvent({
          event_type: 'incident.art73_deadline_escalation',
          module: 'system',
          tenant_id: inc.tenant_id,
          request_id: inc.id,
          payload: {
            incident_id: inc.id,
            level,
            days_remaining: daysRemaining,
            incident_commander: inc.incident_commander,
          },
        }).catch((err: unknown) => {
          console.error(`[Art73 Deadline CRON] Audit log failed for ${inc.id}:`, err);
        });
      }
    }

    console.log(
      `[Art73 Deadline CRON] Processed ${incidents?.length ?? 0} incidents, ` +
      `${alerts.length} alerts sent, ${escalationCount} escalations.`,
    );

    return NextResponse.json({
      success: true,
      incidents_checked: incidents?.length ?? 0,
      alerts_sent: alerts.length,
      escalations: escalationCount,
      alerts,
      timestamp: now.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Art73 Deadline CRON] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
