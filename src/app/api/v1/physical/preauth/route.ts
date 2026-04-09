import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';
import { AuditLedgerService } from '../../../../../../lib/ledger/service';
import { getLedgerSigner } from '../../../../../../lib/ledger/signer';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/physical/preauth
 * Pre-authorise a physical action before execution.
 * Body: { physical_agent_id, action_type, action_detail, zone?, operator_present? }
 * Returns: { verdict: 'authorized'|'blocked', log_id, signature, hitl_ticket_id? }
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    physical_agent_id?: string;
    action_type?: string;
    action_detail?: Record<string, unknown>;
    zone?: string;
    operator_present?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { physical_agent_id, action_type, action_detail = {}, zone, operator_present = false } = body;
  if (!physical_agent_id || !action_type) {
    return NextResponse.json({ error: 'Missing required: physical_agent_id, action_type' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch device and validate it's active
  const { data: device, error: devErr } = await supabase
    .from('physical_agents')
    .select('*')
    .eq('id', physical_agent_id)
    .eq('tenant_id', tenantId)
    .single();

  if (devErr || !device) {
    return NextResponse.json({ error: 'Physical agent not found' }, { status: 404 });
  }

  if (device.status === 'emergency_stopped') {
    return NextResponse.json({ verdict: 'blocked', reason: 'E-STOP active — all physical actions are locked' }, { status: 403 });
  }

  if (device.status !== 'active') {
    return NextResponse.json({ verdict: 'blocked', reason: `Device status: ${device.status}` }, { status: 403 });
  }

  // Zone check
  if (zone && device.allowed_zones.length > 0 && !device.allowed_zones.includes(zone)) {
    return NextResponse.json({
      verdict: 'blocked',
      reason: `Zone '${zone}' not in allowed zones: [${device.allowed_zones.join(', ')}]`
    }, { status: 403 });
  }

  // Sign the log entry
  const signer = getLedgerSigner();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const dataToSign = `${id}|${action_type}|${JSON.stringify(action_detail)}|${createdAt}`;
  const signature = signer.sign(Buffer.from(dataToSign, 'utf-8'));

  // Write to immutable physical action log
  const { data: logEntry, error: logErr } = await supabase
    .from('physical_action_log')
    .insert({
      id,
      tenant_id: tenantId,
      physical_agent_id,
      action_type,
      action_detail,
      zone: zone || null,
      verdict: 'authorized',
      signature,
      operator_present,
      created_at: createdAt,
    })
    .select()
    .single();

  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  // Audit ledger
  await AuditLedgerService.appendEvent({
    event_type: 'physical.action_authorized',
    module: 's15',
    tenant_id: tenantId,
    payload: { physical_agent_id, action_type, zone, log_id: id },
  });

  return NextResponse.json({
    verdict: 'authorized',
    log_id: logEntry.id,
    signature,
    created_at: createdAt,
  });
}
