import { NextRequest, NextResponse } from 'next/server';
import { HitlService } from '../../../../../lib/modules/s7-hitl/service';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/exceptions
 * List recent exceptions for the tenant.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('hitl_exceptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: true }) // alpha sort: critical < high < low < medium (close enough for MVP)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

/**
 * POST /api/v1/exceptions
 * Create a new HITL exception ticket.
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const agentId = request.headers.get('X-Agent-Id');
  if (!tenantId || !agentId) {
    return NextResponse.json({ error: 'Missing Tenant or Agent ID headers' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const ticket = await HitlService.createException(tenantId, agentId, body);
    return NextResponse.json(ticket);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
