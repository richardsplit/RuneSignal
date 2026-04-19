import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/metrics
 *
 * Aggregates platform-wide telemetry for the Executive Dashboard.
 * Covers agents, intents, HITL approvals, incidents, controls, and violations.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id') || request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const supabase = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  try {
    const [
      { count: totalAgents },
      { count: activeIntents },
      { count: openExceptions },
      { count: approvedToday },
      { count: autoApprovedToday },
      { count: slaBreached },
      { count: violationsToday },
      { count: openIncidents },
      { count: seriousIncidents },
      { count: passingControls },
      { count: failingControls },
    ] = await Promise.all([
      supabase.from('agent_credentials').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
      supabase.from('agent_intents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gt('expires_at', new Date().toISOString()),
      supabase.from('hitl_exceptions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'open'),
      supabase.from('hitl_exceptions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'approved').gte('resolved_at', todayIso),
      supabase.from('audit_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('event_type', 'hitl_auto_approved').gte('created_at', todayIso),
      supabase.from('hitl_exceptions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'open').lt('sla_deadline', new Date().toISOString()),
      supabase.from('audit_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('event_type', 'agent.permission_violation').gte('created_at', todayIso),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).not('status', 'eq', 'closed'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_serious_incident', true).not('status', 'eq', 'closed'),
      supabase.from('controls').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'passing'),
      supabase.from('controls').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'failing'),
    ]);

    const riskScore = ((failingControls ?? 0) * 3) + ((slaBreached ?? 0) * 2) + (violationsToday ?? 0);
    const healthStatus =
      riskScore > 15 ? 'critical' :
      riskScore > 5  ? 'at_risk'  :
      'healthy';

    return NextResponse.json({
      summary: {
        agents:              totalAgents     ?? 0,
        active_intents:      activeIntents   ?? 0,
        open_exceptions:     openExceptions  ?? 0,
        violations_today:    violationsToday ?? 0,
      },
      approvals: {
        open:              openExceptions   ?? 0,
        approved_today:    approvedToday    ?? 0,
        auto_approved_today: autoApprovedToday ?? 0,
        sla_breached:      slaBreached      ?? 0,
      },
      incidents: {
        open:    openIncidents   ?? 0,
        serious: seriousIncidents ?? 0,
      },
      controls: {
        passing: passingControls ?? 0,
        failing: failingControls ?? 0,
      },
      health_status: healthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[metrics] Aggregation error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
