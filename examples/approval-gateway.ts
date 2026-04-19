/**
 * RuneSignal SDK — Approval Gateway Usage Example
 *
 * Demonstrates how an external AI agent or workflow integration calls
 * POST /api/v1/approval-requests to request human-in-the-loop approval
 * before executing a sensitive action.
 *
 * Features demonstrated:
 *  - Submitting an approval request with blast-radius metadata
 *  - Idempotency-Key header for safe retries
 *  - Polling for a decision (approve / reject / auto_approved)
 *  - Configuring SLA auto-action fallback
 *  - Routing to specific notification channels (Slack, Teams)
 *
 * Usage:
 *   RUNESIGNAL_API_KEY=rsk_live_... ts-node examples/approval-gateway.ts
 */

const BASE_URL = process.env.RUNESIGNAL_BASE_URL ?? 'https://app.runesignal.com';
const API_KEY  = process.env.RUNESIGNAL_API_KEY  ?? '';

if (!API_KEY) {
  console.error('RUNESIGNAL_API_KEY is not set');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'auto_approved'
  | 'escalated';

interface ApprovalResponse {
  id: string;
  status: ApprovalStatus;
  blast_radius: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    factors: string[];
  };
  sla: {
    deadline: string | null;
    auto_action: 'approve' | 'reject' | 'escalate';
  };
  regulation_refs: string[];
  channels_notified: string[];
}

interface ApprovalDecision {
  id: string;
  status: ApprovalStatus;
  resolved_at?: string;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function requestApproval(params: {
  agentId: string;
  actionCategory: 'financial' | 'pii' | 'deploy' | 'comms' | 'infrastructure' | 'data_deletion' | 'model_update';
  actionDescription: string;
  toolName?: string;
  resource?: string;
  slaAutoAction?: 'approve' | 'reject' | 'escalate';
  idempotencyKey?: string;
  channels?: ('slack' | 'teams' | 'jira' | 'servicenow')[];
  contextData?: Record<string, unknown>;
}): Promise<ApprovalResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };
  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey;
  }

  const res = await fetch(`${BASE_URL}/api/v1/approval-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      agent_id: params.agentId,
      action: {
        category:    params.actionCategory,
        description: params.actionDescription,
        tool_name:   params.toolName,
        resource:    params.resource,
      },
      sla: {
        auto_action: params.slaAutoAction ?? 'escalate',
      },
      routing: {
        channels: params.channels,
      },
      context_data: params.contextData,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Approval request failed (${res.status}): ${(err as any).error ?? res.statusText}`);
  }

  const data = await res.json() as ApprovalResponse;
  const replayed = res.headers.get('Idempotent-Replayed') === 'true';
  if (replayed) {
    console.log(`[approval-gateway] Idempotent replay — returned existing request ${data.id}`);
  }

  return data;
}

async function pollDecision(
  approvalId: string,
  options: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<ApprovalDecision> {
  const { pollIntervalMs = 5_000, timeoutMs = 300_000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/api/v1/approval-requests/${approvalId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });

    if (res.ok) {
      const data = await res.json() as ApprovalDecision;
      if (data.status !== 'pending') {
        return data;
      }
      console.log(`[approval-gateway] Still pending (${approvalId})… checking again in ${pollIntervalMs / 1000}s`);
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Approval request ${approvalId} timed out after ${timeoutMs / 1000}s`);
}

// ---------------------------------------------------------------------------
// Example flow
// ---------------------------------------------------------------------------

async function main() {
  const AGENT_ID       = 'agt-example-001';
  const IDEMPOTENCY_KEY = `send-report-${new Date().toISOString().slice(0, 13)}`; // hourly deduplicate

  console.log('=== RuneSignal Approval Gateway Example ===\n');

  // 1. Submit an approval request for a low-risk comms action
  console.log('1. Requesting approval for comms action…');
  const approval = await requestApproval({
    agentId: AGENT_ID,
    actionCategory: 'comms',
    actionDescription: 'Send weekly compliance summary email to legal@acme.com',
    toolName: 'send_email',
    resource: 'legal@acme.com',
    idempotencyKey: IDEMPOTENCY_KEY,
    slaAutoAction: 'escalate',    // escalate if SLA expires without a decision
    channels: ['slack'],
    contextData: {
      email_subject: 'Weekly Compliance Summary',
      recipient_count: 1,
    },
  });

  console.log(`   ID:           ${approval.id}`);
  console.log(`   Status:       ${approval.status}`);
  console.log(`   Blast radius: ${approval.blast_radius.level} (score ${approval.blast_radius.score})`);
  console.log(`   SLA deadline: ${approval.sla.deadline ?? 'N/A'}`);
  console.log(`   Reg refs:     ${approval.regulation_refs.join(', ') || 'none'}`);
  console.log(`   Notified:     ${approval.channels_notified.join(', ') || 'none'}\n`);

  // 2. If already decided (auto-approve), skip polling
  if (approval.status === 'auto_approved' || approval.status === 'approved') {
    console.log('2. Action already approved — proceeding immediately.\n');
    return executeAction(approval.status);
  }

  // 3. Poll for a human decision
  console.log('2. Waiting for human decision…');
  const decision = await pollDecision(approval.id, {
    pollIntervalMs: 3_000,
    timeoutMs:      60_000,  // 1-minute demo timeout
  });

  console.log(`\n   Decision: ${decision.status.toUpperCase()}`);
  console.log(`   Resolved: ${decision.resolved_at ?? 'n/a'}\n`);

  // 4. Act on the decision
  await executeAction(decision.status);
}

async function executeAction(status: ApprovalStatus) {
  switch (status) {
    case 'approved':
    case 'auto_approved':
      console.log('✅ Executing approved action: sending compliance email…');
      // await sendEmail(...)
      break;
    case 'rejected':
      console.log('🚫 Action rejected — aborting.');
      break;
    case 'escalated':
      console.log('⚠️  Request escalated — will retry after SLA reset.');
      break;
    default:
      console.log(`⏳ Unexpected status: ${status}`);
  }
}

// ---------------------------------------------------------------------------
// High-risk example: financial transfer requiring manual approval
// ---------------------------------------------------------------------------

async function highRiskExample() {
  console.log('=== High-Risk Financial Action Example ===\n');

  const approval = await requestApproval({
    agentId: 'agt-finance-001',
    actionCategory: 'financial',
    actionDescription: 'Transfer $45,000 to vendor invoice INV-2026-0342',
    toolName: 'bank_transfer',
    resource: 'account:GB29NWBK60161331926819',
    slaAutoAction: 'reject',      // auto-reject if no human responds within SLA
    channels: ['slack', 'teams'],
    contextData: {
      amount_usd: 45_000,
      vendor: 'Acme Supplies Ltd',
      invoice_ref: 'INV-2026-0342',
    },
  });

  console.log(`Approval ID: ${approval.id}`);
  console.log(`Blast radius: ${approval.blast_radius.level} — ${JSON.stringify(approval.blast_radius.factors)}`);
  console.log(`SLA auto-action: ${approval.sla.auto_action} at ${approval.sla.deadline}\n`);
}

main()
  .then(() => highRiskExample())
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
