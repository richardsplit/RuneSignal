import { NextRequest, NextResponse } from 'next/server';
import { IdentityService } from '../../../../../../lib/modules/s6-identity/service';

/**
 * GET /api/v1/agents/:id
 * Returns full agent details: credentials, scopes, risk score.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { id: agentId } = await params;

  try {
    const detail = await IdentityService.getAgentDetail(agentId, tenantId);
    if (!detail) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/agents/:id
 * Update agent metadata or status.
 * Body: { status?: 'active' | 'suspended', reason?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { id: agentId } = await params;

  try {
    const body = await request.json();
    const { status, reason } = body;

    if (status === 'suspended') {
      await IdentityService.suspendAgent(agentId, tenantId, reason || 'Manual suspension');
      return NextResponse.json({ message: `Agent ${agentId} suspended` });
    }

    if (status === 'active') {
      await IdentityService.reactivateAgent(agentId, tenantId);
      return NextResponse.json({ message: `Agent ${agentId} reactivated` });
    }

    return NextResponse.json({ error: 'Unsupported status value. Use "active" or "suspended".' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/agents/:id
 * Permanently revokes an agent.
 * Body: { reason?: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { id: agentId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    await IdentityService.revokeAgent(agentId, tenantId, body?.reason || 'Manual revocation');
    return NextResponse.json({ message: `Agent ${agentId} revoked permanently` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
