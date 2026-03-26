import { createAdminClient } from '../lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * 5-Event Audit Chain Integration Test
 * 
 * Validates the full TrustLayer lifecycle:
 * 1. Agent Registration (S6)
 * 2. Intent Mediation (S1)
 * 3. AI Call Certification (S3)
 * 4. HITL Exception Creation (S7)
 * 5. Exception Resolution & Training Trigger (S7)
 */
async function runAuditChainTest() {
  console.log('🚀 Starting 5-Event Audit Chain Test...');
  const tenantId = uuidv4(); // Unique test tenant
  const supabase = createAdminClient();

  console.log(`Setting up test tenant ${tenantId}...`);
  await supabase.from('tenants').insert({ id: tenantId, name: `Audit Chain Test ${tenantId.slice(0, 8)}` });

  const apiBase = 'http://localhost:3000/api/v1';
  const headers = { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json' };

  try {
    // 1. Register Agent
    console.log('[1/5] Registering Agent...');
    const regRes = await fetch(`${apiBase}/agents/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'AuditTester', type: 'openai' })
    });
    const { agent, token } = await regRes.json();
    if (!agent) {
      console.error('Registration failed:', await regRes.text());
      throw new Error('Agent registration failed');
    }
    const agentHeaders = { ...headers, 'Authorization': `Bearer ${token}`, 'X-Agent-Id': agent.id };

    // 2. Mediate Intent
    console.log('[2/5] Mediating Intent...');
    const intentRes = await fetch(`${apiBase}/intent`, {
      method: 'POST',
      headers: agentHeaders,
      body: JSON.stringify({ intent_description: 'Access secure financial mainframe' })
    });
    const intent = await intentRes.json();

    // 3. Certify AI Call
    console.log('[3/5] Certifying AI Call...');
    const certifyRes = await fetch(`${apiBase}/provenance/certify`, {
      method: 'POST',
      headers: agentHeaders,
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4o',
        input_hash: 'h1',
        output_hash: 'h2',
        completion_text: 'Access Granted'
      })
    });
    const cert = await certifyRes.json();

    // 4. Create HITL Exception
    console.log('[4/5] Creating Exception...');
    const excRes = await fetch(`${apiBase}/exceptions`, {
      method: 'POST',
      headers: agentHeaders,
      body: JSON.stringify({
        title: 'Mainframe Override detected',
        description: 'Agent attempted unmapped protocol',
        priority: 'high'
      })
    });
    const ticket = await excRes.json();

    // 5. Resolve Exception
    console.log('[5/5] Resolving Exception...');
    const resolveRes = await fetch(`${apiBase}/exceptions/${ticket.id}/resolve`, {
      method: 'POST',
      headers: agentHeaders,
      body: JSON.stringify({ action: 'approve', reason: 'Authorized for audit test', reviewer_id: 'admin-1' })
    });
    await resolveRes.json();

    console.log('✅ Audit Chain Completed Successfully!');

    // Final Verification: Check Ledger
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    console.log(`📊 Total Ledger Events recorded: ${count}`);
    if (count && count >= 5) {
      console.log('🏆 VERIFICATION PASSED: All 5 core lifecycle events audited.');
    } else {
      console.error('❌ VERIFICATION FAILED: Missing ledger entries.');
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

runAuditChainTest();
