import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createAdminClient } from '../lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import { IdentityService } from '../lib/modules/s6-identity/service';
import { ArbiterService } from '../lib/modules/s1-conflict/service';
import { CertificateService } from '../lib/modules/s3-provenance/certificate';
import { HitlService } from '../lib/modules/s7-hitl/service';

/**
 * 5-Event Audit Chain Integration Test (Direct Service version)
 */
async function runAuditChainTest() {
  console.log('🚀 Starting 5-Event Audit Chain Test...');
  const tenantId = uuidv4();
  const supabase = createAdminClient();

  console.log(`Setting up test tenant ${tenantId}...`);
  await supabase.from('tenants').insert({ id: tenantId, name: `Audit Chain Test ${tenantId.slice(0, 8)}` });

  try {
    // 1. Agent Registration (S6)
    console.log('[1/5] Registering Agent...');
    const { agent, token } = await IdentityService.registerAgent(tenantId, { 
      agent_name: 'AuditTester', 
      agent_type: 'custom' 
    });
    console.log('✅ Agent Registered');

    // 2. Intent Mediation (S1)
    console.log('[2/5] Mediating Intent...');
    const intentRes = await ArbiterService.mediateIntent(tenantId, agent.id, { 
      intent_description: 'Access secure financial mainframe',
      resource_name: 'mainframe:001'
    });
    console.log(`✅ Intent Meditated: ${intentRes.decision}`);

    // 3. AI Call Certification (S3)
    console.log('[3/5] Certifying AI Call...');
    await CertificateService.certifyCall(tenantId, agent.id, {
      provider: 'openai',
      model: 'gpt-4o',
      input_hash: 'h1',
      output_hash: 'h2',
      completion_text: 'Access Granted',
      user_messages: [{ role: 'user', content: 'Can I access the mainframe?' }]
    });
    console.log('✅ Call Certified');

    // 4. Create HITL Exception (S7)
    console.log('[4/5] Creating Exception...');
    const ticket = await HitlService.createException(tenantId, agent.id, {
      title: 'Mainframe Override detected',
      description: 'Agent attempted unmapped protocol',
      priority: 'high'
    });
    console.log('✅ Exception Created');

    // 5. Resolve Exception (S7)
    console.log('[5/5] Resolving Exception...');
    await HitlService.resolveException(tenantId, ticket.id, { 
      action: 'approve', 
      reason: 'Authorized for audit test', 
      reviewer_id: '00000000-0000-0000-0000-000000000000' 
    });
    console.log('✅ Exception Resolved');

    console.log('✅ Audit Chain Completed Successfully!');

    // Final Verification: Check Ledger
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
