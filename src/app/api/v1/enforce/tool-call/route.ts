import { NextResponse } from 'next/server';
import { McpEnforcementProxy } from '../../../../../../lib/modules/s6-identity/mcp-proxy';

export async function POST(request: Request) {
  try {
    const agentId = request.headers.get('X-Agent-Id');
    if (!agentId) {
      return NextResponse.json({ error: 'Missing Agent Credential' }, { status: 401 });
    }

    const { tool_name } = await request.json();
    if (!tool_name) {
      return NextResponse.json({ error: 'Missing tool_name' }, { status: 400 });
    }

    const result = await McpEnforcementProxy.enforceToolCall(agentId, tool_name);

    if (!result.allowed) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
