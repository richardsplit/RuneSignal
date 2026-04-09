import { NextRequest, NextResponse } from 'next/server';
import { A2AGatewayService } from '../../../../../../lib/modules/s16-a2a/service';

/**
 * POST /api/v1/a2a/handshake
 * Initiate a governed A2A handshake contract between two agents.
 * Requires both agents to sign before governance checks run.
 * Body: { initiator_id, responder_id, task_description, metadata? }
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    initiator_id?: string;
    responder_id?: string;
    task_description?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { initiator_id, responder_id, task_description, metadata = {} } = body;
  if (!initiator_id || !responder_id || !task_description) {
    return NextResponse.json({
      error: 'Missing required: initiator_id, responder_id, task_description'
    }, { status: 400 });
  }

  try {
    const handshake = await A2AGatewayService.initiateHandshake(
      tenantId, initiator_id, responder_id,
      { task_description, ...metadata }
    );
    return NextResponse.json({ handshake }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
