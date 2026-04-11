import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/db/supabase';

/**
 * GET /api/v1/metrics
 * 
 * Aggregates platform-wide telemetry for the Executive Dashboard.
 * Includes counts for agents, intents, claims, exceptions, and violations.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const supabase = createAdminClient();

  try {
    // Parallel Execution for all metric counts
    const [
      { count: totalAgents },
      { count: activeIntents },
      { count: openExceptions },
      { count: violationsToday }
    ] = await Promise.all([
      supabase.from('agent_credentials').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('agent_intents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gt('expires_at', new Date().toISOString()),
      supabase.from('hitl_exceptions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'open'),
      supabase.from('audit_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('event_type', 'agent.permission_violation')
    ]);

    return NextResponse.json({
      summary: {
        agents: totalAgents || 0,
        active_intents: activeIntents || 0,
        open_exceptions: openExceptions || 0,
        violations_today: violationsToday || 0
      },
      health_status: (violationsToday || 0) > 5 ? 'at_risk' : 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Metrics Aggregation Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
