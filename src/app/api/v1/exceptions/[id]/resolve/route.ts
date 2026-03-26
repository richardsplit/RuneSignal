import { NextRequest, NextResponse } from 'next/server';
import { HitlService } from '../../../../../../../lib/modules/s7-hitl/service';
import { createAdminClient } from '../../../../../../../lib/db/supabase';

/**
 * POST /api/v1/exceptions/[id]/resolve
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const result = await HitlService.resolveException(tenantId, id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
