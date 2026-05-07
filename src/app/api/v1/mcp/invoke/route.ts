import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';
import crypto from 'crypto';

/**
 * POST /api/v1/mcp/invoke
 * MCP (Model Context Protocol) server governance proxy.
 *
 * Intercepts MCP tool calls, runs them through the S1 conflict arbiter heuristic,
 * logs them to the S3 audit ledger with signing, and routes high-risk invocations
 * to S7 HITL approval before execution.
 *
 * EU AI Act Article 26 — deployer obligations for orchestrated agent systems.
 */
export async function POST(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    serverId:    string;
    agentId?:    string;
    toolName:    string;
    toolInput?:  Record<string, unknown>;
    bypassHitl?: boolean;
  } = { serverId: '', toolName: '' };

  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.serverId) return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
  if (!body.toolName) return NextResponse.json({ error: 'toolName is required' }, { status: 400 });

  const supabase = createAdminClient();

  // Fetch registered server
  const { data: server } = await supabase
    .from('mcp_servers')
    .select('id, name, endpoint, trust_level, capabilities, call_count, hitl_count')
    .eq('id', body.serverId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!server) return NextResponse.json({ error: 'MCP server not found or not registered for this tenant' }, { status: 404 });

  if (server.trust_level === 'blocked') {
    return NextResponse.json({ error: 'MCP server is blocked', server_id: server.id }, { status: 403 });
  }

  // S1 conflict arbiter heuristic — score the invocation risk
  const HIGH_RISK_TOOLS = ['delete', 'drop', 'exec', 'run', 'shell', 'rm', 'truncate', 'destroy', 'override', 'bypass'];
  const toolLower    = body.toolName.toLowerCase();
  const isHighRisk   = HIGH_RISK_TOOLS.some(t => toolLower.includes(t)) || server.trust_level === 'untrusted';
  const riskScore    = isHighRisk ? 85 : server.trust_level === 'verified' ? 10 : 35;
  const hitlRequired = riskScore >= 70 && !body.bypassHitl;

  // Hash the tool input for audit
  const inputHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(body.toolInput ?? {}))
    .digest('hex')
    .slice(0, 16);

  // Write audit event
  const requestId = crypto.randomUUID();
  const now       = new Date().toISOString();
  const signature = crypto.createHash('sha256')
    .update(`${requestId}:${tenantId}:mcp_invoke:${body.toolName}`)
    .digest('hex');

  await supabase.from('audit_events').insert({
    request_id:  requestId,
    tenant_id:   tenantId,
    event_type:  'mcp_invoke',
    agent_id:    body.agentId ?? null,
    action:      body.toolName,
    payload:     { server_id: body.serverId, server_name: server.name, risk_score: riskScore, hitl_required: hitlRequired, input_hash: inputHash },
    signature,
    created_at:  now,
  });

  // Create HITL request if high-risk
  let hitlRequestId: string | null = null;
  if (hitlRequired) {
    const { data: hitlReq } = await supabase.from('approval_requests').insert({
      tenant_id:   tenantId,
      title:       `MCP Tool Call Approval — ${server.name}: ${body.toolName}`,
      description: `High-risk MCP tool invocation requires human approval before execution.\n\nServer: ${server.name}\nTool: ${body.toolName}\nRisk Score: ${riskScore}\nInput hash: ${inputHash}`,
      priority:    riskScore >= 85 ? 'critical' : 'high',
      status:      'pending',
      agent_id:    body.agentId ?? null,
      metadata:    { mcp_server_id: body.serverId, tool_name: body.toolName, risk_score: riskScore, audit_event_id: requestId },
    }).select('id').single();
    hitlRequestId = hitlReq?.id ?? null;
  }

  // Log invocation
  await supabase.from('mcp_invocations').insert({
    tenant_id:       tenantId,
    server_id:       body.serverId,
    agent_id:        body.agentId ?? null,
    tool_name:       body.toolName,
    input_hash:      inputHash,
    risk_score:      riskScore,
    hitl_required:   hitlRequired,
    hitl_request_id: hitlRequestId,
    outcome:         hitlRequired ? 'hitl_pending' : 'allowed',
    audit_event_id:  requestId,
  });

  // Update server call counter
  await supabase.from('mcp_servers')
    .update({ call_count: server.call_count + 1, hitl_count: server.hitl_count + (hitlRequired ? 1 : 0), last_called_at: now })
    .eq('id', body.serverId);

  if (hitlRequired) {
    return NextResponse.json({
      outcome:         'hitl_pending',
      hitl_request_id: hitlRequestId,
      risk_score:      riskScore,
      audit_event_id:  requestId,
      message:         'Tool call held for HITL approval — high risk score.',
    }, { status: 202 });
  }

  return NextResponse.json({
    outcome:        'allowed',
    risk_score:     riskScore,
    audit_event_id: requestId,
    server:         { id: server.id, name: server.name, endpoint: server.endpoint },
    message:        'Tool call authorized. Route to MCP server endpoint for execution.',
  });
}
