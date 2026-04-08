import { NextRequest, NextResponse } from 'next/server';
import { IdentityService } from '../../../../../../../lib/modules/s6-identity/service';

/**
 * POST /api/v1/agents/:id/rotate
 * Rotates the agent JWT token. Returns the new token.
 * The old token is invalidated via audit log — the agent should exchange the new token immediately.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { id: agentId } = await params;

  try {
    const result = await IdentityService.rotateAgentToken(agentId, tenantId);
    return NextResponse.json({
      agent_id: agentId,
      token: result.token,
      message: 'Token rotated successfully. Update your agent configuration immediately.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
