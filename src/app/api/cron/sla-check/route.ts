import { NextResponse } from 'next/server';
import { HitlService } from '../../../../../lib/modules/s7-hitl/service';

/**
 * Vercel CRON Job Handler
 * GET /api/cron/sla-check
 * 
 * This endpoint is called on a schedule (e.g. every 10 mins) to scan for
 * HITL tickets that have breached their SLA and escalate them automatically.
 */
export async function GET(request: Request) {
  // Simple token-based security for CRON jobs
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const escalatedCount = await HitlService.checkSlas();
    console.log(`[SLA CRON] Successfully processed. Escalated ${escalatedCount} tickets.`);
    
    return NextResponse.json({ 
      success: true, 
      escalated_count: escalatedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[SLA CRON] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
