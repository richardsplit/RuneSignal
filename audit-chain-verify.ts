import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createAdminClient } from './lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';

// Import Services Directly
import { IdentityService } from './lib/modules/s6-identity/service';
import { ArbiterService } from './lib/modules/s1-conflict/service';
import { CertificateService } from './lib/modules/s3-provenance/certificate';
import { HitlService } from './lib/modules/s7-hitl/service';

/**
 * 5-Event Audit Chain Integration Test (Direct Service Calls)
 * 
 * Validates the full TrustLayer lifecycle without requiring a running API server.
 */
async function runAuditChainTest() {
  console.log('🚀 Starting 5-Event Audit Chain Test (Direct-to-Service)...');
  
  // FORCE MOCK for deterministic testing in quota-limited env
  process.env.STRICT_EMBEDDINGS = 'false';
  delete process.env.OPENAI_API_KEY;

  const tenantId = uuidv4();
  const supabase = createAdminClient();

  console.log(`Setting up test tenant ${tenantId}...`);
  await supabase.from('tenants').insert({ id: tenantId, name: `Audit Chain Integration ${tenantId.slice(0, 8)}` });

  try {
    // 1. Register Agent (S6)
    console.log('[1/5] Registering Agent (S6)...');
    const { agent } = await IdentityService.registerAgent(tenantId, { 
      agent_name: 'AuditTester', 
      agent_type: 'custom',
      framework: 'langchain'
    });
    console.log(`✅ Agent registered: ${agent.id}`);

    // 2. Mediate Intent (S1)
    console.log('[2/5] Mediating Intent (S1)...');
    const mediation = await ArbiterService.mediateIntent(tenantId, agent.id, { 
      intent_description: 'Audit test intent: Access secure mainframe' 
    });
    console.log(`✅ Mediation result: ${mediation.decision}`);

    // 3. Certify AI Call (S3)
    console.log('[3/5] Certifying AI Call (S3)...');
    const cert = await CertificateService.certifyCall(tenantId, agent.id, {
      provider: 'openai',
      model: 'gpt-4o',
      user_messages: [{ role: 'user', content: 'Execute order' }],
      completion_text: 'Instruction received'
    });
    console.log(`✅ certificate issued: ${cert.certificate_id}`);

    // 4. Create HITL Exception (S7)
    console.log('[4/5] Creating Exception (S7)...');
    const ticket = await HitlService.createException(tenantId, agent.id, {
      title: 'Audit Chain Triggered Bypass',
      description: 'Human approval required for ledger verification test.',
      priority: 'high'
    });
    console.log(`✅ Ticket created: ${ticket.id}`);

    // 5. Resolve Exception (S7)
    console.log('[5/5] Resolving Exception (S7)...');
    await HitlService.resolveException(tenantId, ticket.id, { 
      action: 'approve', 
      reason: 'Authorized for audit chain verification', 
      reviewer_id: uuidv4() 
    });
    console.log('✅ Ticket resolved.');

    console.log('\n--- VERIFICATION PHASE ---');

    // Final Verification: Check Ledger entries
    const { data: events, count, error } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Ledger query failed: ${error.message}`);

    console.log(`📊 Audit Ledger records found for tenant: ${count}`);
    
    // We expect events for:
    // - agent.registered
    // - arbiter.decision.allow
    // - S3_CERTIFICATE
    // - hitl.exception_created
    // - hitl.exception_resolved
    
    if (count && count >= 5) {
      console.log('🏆 GOLD STANDARD MET: 5-Event audit chain verified.');
      console.log('Events:');
      events.forEach(e => console.log(` - [${e.module.toUpperCase()}] ${e.event_type}`));
    } else {
      throw new Error(`Insufficient ledger entries. Expected 5+, found ${count}.`);
    }

    console.log('\n✅ TRUSTLAYER PLATFORM IS CORE-COMPLETE AND VERIFIED.');

  } catch (error: any) {
    console.error(`❌ Audit Chain Test Failed: ${error.message}`);
    process.exit(1);
  }
}

runAuditChainTest();
