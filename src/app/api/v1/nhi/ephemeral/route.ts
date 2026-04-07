import { NextRequest, NextResponse } from 'next/server';
import { NHIService } from '@lib/modules/s12-nhi/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const parentAgentId = request.headers.get('X-Agent-Id');

  if (!tenantId || !parentAgentId) {
    return NextResponse.json({ error: 'X-Tenant-Id and X-Agent-Id required' }, { status: 400 });
  }

  const body = await request.json();
  const { purpose, max_minutes, scopes } = body;
  if (!purpose) return NextResponse.json({ error: 'purpose is required' }, { status: 400 });

  try {
    const result = await NHIService.issueEphemeral(tenantId, parentAgentId, purpose, max_minutes, scopes);
    return NextResponse.json({
      ...result,
      warning: 'This API key is shown ONCE. Store it securely. It cannot be retrieved again.'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
