import { NextResponse } from 'next/server';
import { IdentityService } from '@/../lib/modules/s6-identity/service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, description } = body;

    // Hardcoded tenant for local dev / MVP
    const tenantId = '11111111-1111-1111-1111-111111111111';

    const result = await IdentityService.registerAgent(tenantId, {
      agent_name: name,
      agent_type: type,
      framework: type,   // simplfying for mvp
      public_key: 'mock-pub-key-not-provided' // simple mock key
    });

    return NextResponse.json({ success: true, agent: result.agent, token: result.token });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
