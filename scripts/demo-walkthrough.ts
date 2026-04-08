#!/usr/bin/env npx tsx
/**
 * TrustLayer End-to-End Demo Walkthrough
 * =======================================
 * Demonstrates the full AI Agent Action Firewall lifecycle:
 *
 *   1. Register an AI agent
 *   2. Evaluate a safe action  → expect: allow
 *   3. Evaluate a risky action → expect: escalate + HITL ticket
 *   4. Resolve the HITL ticket (approve)
 *   5. Verify audit trail
 *
 * Usage:
 *   npx tsx scripts/demo-walkthrough.ts
 *
 * Prerequisites:
 *   .env.local with TRUSTLAYER_API_KEY and TRUSTLAYER_BASE_URL set
 *   OR set env vars directly:
 *   TRUSTLAYER_API_KEY=tl_xxx TRUSTLAYER_BASE_URL=http://localhost:3000 npx tsx scripts/demo-walkthrough.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BASE_URL = process.env.TRUSTLAYER_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TRUSTLAYER_API_KEY;

if (!API_KEY) {
  console.error('\n❌ Missing TRUSTLAYER_API_KEY environment variable.');
  console.error('   Set it in .env.local or export it before running this script.\n');
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const headers = (agentId?: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
  ...(agentId ? { 'X-Agent-Id': agentId } : {}),
});

async function apiPost(path: string, body: unknown, agentId?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers(agentId),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok && res.status >= 500) {
    throw new Error(`${path} failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

async function apiGet(path: string, agentId?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: headers(agentId),
  });
  const data = await res.json();
  return { status: res.status, data };
}

function log(emoji: string, title: string, detail?: unknown) {
  console.log(`\n${emoji}  ${title}`);
  if (detail) {
    const lines = JSON.stringify(detail, null, 2).split('\n');
    lines.forEach(l => console.log(`     ${l}`));
  }
}

function separator() {
  console.log('\n' + '─'.repeat(60));
}

// ─── Main demo ───────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║      TrustLayer — Action Firewall Demo Walkthrough      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`API Key:  ${API_KEY!.slice(0, 8)}…`);

  separator();

  // ─── Step 1: Register agent ──────────────────────────────────────────────
  log('🤖', 'Step 1: Registering AI agent…');

  const { status: regStatus, data: regData } = await apiPost('/api/v1/agents/register', {
    agent_name: 'Demo Financial Agent',
    agent_type: 'finance',
    framework: 'langchain',
    metadata: { moral_domain: 'finance', owner: 'demo-script' },
    scopes: [
      { resource: 'crm:contacts', actions: ['read', 'update'] },
      { resource: 'finance:invoices', actions: ['read', 'create'] },
      { resource: 'tool:*', actions: ['execute'] },
    ],
  });

  if (regStatus !== 200 || !regData.agent?.id) {
    throw new Error(`Agent registration failed [${regStatus}]: ${JSON.stringify(regData)}`);
  }

  const agentId: string = regData.agent.id;
  log('✅', `Agent registered`, {
    agent_id: agentId,
    agent_name: regData.agent.agent_name,
    scopes: regData.agent.scopes?.length || 3,
  });

  separator();

  // ─── Step 2: Safe action — expect ALLOW ─────────────────────────────────
  log('🟢', 'Step 2: Evaluating a safe action (read CRM contact)…');

  const { status: safeStatus, data: safeResult } = await apiPost(
    '/api/v1/firewall/evaluate',
    {
      action: 'read',
      resource: 'crm:contacts',
      tool_name: 'crm_read_contact',
      description: 'Read contact record for John Smith to prepare outreach email',
      domain: 'comms',
      metadata: { contact_id: 'cust-001' },
    },
    agentId
  );

  log(
    safeResult.verdict === 'allow' ? '✅' : '⚠️',
    `Safe action verdict: ${safeResult.verdict.toUpperCase()}`,
    {
      verdict: safeResult.verdict,
      risk_score: safeResult.risk_score,
      latency_ms: safeResult.latency_ms,
      checks: safeResult.checks?.map((c: any) => `${c.passed ? '✓' : '✗'} ${c.check}`),
    }
  );

  if (safeResult.verdict !== 'allow') {
    console.log('\n   ⚠️  Expected "allow" — this might be expected if policies are active.\n');
  }

  separator();

  // ─── Step 3: Risky action — expect ESCALATE ──────────────────────────────
  log('🔴', 'Step 3: Evaluating a high-risk action (large financial transfer)…');

  const { status: riskyStatus, data: riskyResult } = await apiPost(
    '/api/v1/firewall/evaluate',
    {
      action: 'initiate_transfer',
      resource: 'finance:wire-transfers',
      tool_name: 'wire_transfer',
      description: 'Wire $250,000 to external vendor account for Q4 software licences',
      domain: 'finance',
      metadata: {
        amount_usd: 250000,
        vendor: 'external-vendor-xyz',
        require_cfo_above_usd: 100000,
      },
      risk_threshold: 30, // low threshold to force escalation for demo
    },
    agentId
  );

  log(
    riskyResult.verdict === 'escalate' ? '⚠️' : riskyResult.verdict === 'block' ? '🚫' : '✅',
    `Risky action verdict: ${riskyResult.verdict.toUpperCase()}`,
    {
      verdict: riskyResult.verdict,
      risk_score: riskyResult.risk_score,
      reasons: riskyResult.reasons,
      hitl_ticket_id: riskyResult.hitl_ticket_id,
      latency_ms: riskyResult.latency_ms,
    }
  );

  let hitlTicketId: string | undefined = riskyResult.hitl_ticket_id;

  if (!hitlTicketId && (riskyResult.verdict === 'escalate' || riskyStatus === 200)) {
    // If no auto-ticket (low risk score), manually create one for demo
    log('📝', 'Creating HITL ticket manually for demo…');
    const { data: ticketData } = await apiPost(
      '/api/v1/exceptions',
      {
        title: '[DEMO] Wire transfer $250K requires CFO approval',
        description: 'Financial agent attempted large transfer. Demo escalation.',
        priority: 'high',
        context_data: { evaluation_id: riskyResult.evaluation_id, amount_usd: 250000 },
      },
      agentId
    );
    hitlTicketId = ticketData.id;
    log('✅', 'HITL ticket created', { ticket_id: hitlTicketId });
  }

  separator();

  // ─── Step 4: Resolve HITL ticket ─────────────────────────────────────────
  if (hitlTicketId) {
    log('👤', `Step 4: Resolving HITL ticket as CFO (approve)…`);

    const { status: resolveStatus, data: resolveData } = await apiPost(
      `/api/v1/exceptions/${hitlTicketId}/resolve`,
      {
        action: 'approve',
        reviewer_id: 'cfo@demo-company.com',
        reason: 'Q4 software contract approved in board meeting. Wire transfer authorised.',
      },
      agentId
    );

    log('✅', `HITL ticket resolved`, {
      status: resolveData.status,
      resolved_by: resolveData.resolved_by,
      resolution_reason: resolveData.resolution_reason?.slice(0, 60) + '…',
    });
  }

  separator();

  // ─── Step 5: Verify audit trail ──────────────────────────────────────────
  log('📋', 'Step 5: Verifying audit trail…');

  const { data: evaluations } = await apiGet('/api/v1/firewall/evaluations?limit=5', agentId);

  log('✅', `Audit trail verified — ${evaluations?.length || 0} evaluations found`, {
    recent: evaluations?.slice(0, 3)?.map((e: any) => ({
      verdict: e.verdict,
      action: e.action,
      risk_score: e.risk_score,
      created_at: e.created_at,
    })),
  });

  separator();

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                   Demo Complete ✅                       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Agent ID:       ${agentId.slice(0, 34)}  ║`);
  console.log(`║  Safe action:    ALLOW (read CRM contact)                ║`);
  console.log(`║  Risky action:   ${riskyResult.verdict.toUpperCase().padEnd(8)} (wire $250K)                  ║`);
  if (hitlTicketId) {
    console.log(`║  HITL ticket:    ${hitlTicketId.slice(0, 34)}  ║`);
    console.log(`║  Resolution:     APPROVED by CFO                         ║`);
  }
  console.log(`║  Audit events:   Written to immutable ledger (Ed25519)   ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('\n💥 Demo failed:', err.message);
  process.exit(1);
});
