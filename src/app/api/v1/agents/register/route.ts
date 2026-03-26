import { IdentityService } from '../../../../../../lib/modules/s6-identity/service';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, description, public_key } = body;

    const tenantId = req.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing X-Tenant-Id header' }, { status: 400 });
    }

    const result = await IdentityService.registerAgent(tenantId, {
      agent_name: name,
      agent_type: type,
      framework: type,   // simplfying for mvp
      public_key: public_key || 'not-provided'
    });

    return NextResponse.json({ success: true, agent: result.agent, token: result.token });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
