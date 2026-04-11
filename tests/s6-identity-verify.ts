import { createAdminClient } from '../lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';

async function runS6Tests() {
  const tenantId = process.env.TEST_TENANT_ID || 'test-tenant-id';
  const agentId = uuidv4();
  const supabase = createAdminClient();

  console.log('--- STARTING S6 IDENTITY TESTS ---');

  try {
    // 1. Test: Agent Registration (Direct DB for now)
    console.log('Testing Agent Registration...');
    const { data: agent, error } = await supabase
      .from('agent_credentials')
      .insert({
        id: agentId,
        tenant_id: tenantId,
        agent_name: 'S6_Identity_Test_Agent',
        agent_type: 'orchestrator',
        framework: 'langgraph',
        status: 'active',
        metadata: { version: '1.0.0' }
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`✅ Agent Registered: ${agent.id}`);

    // 2. Test: Status Enforcement Simulation
    console.log('Testing Status Revocation...');
    await supabase.from('agent_credentials').update({ status: 'suspended' }).eq('id', agentId);
    
    const { data: updatedAgent } = await supabase
      .from('agent_credentials')
      .select('status')
      .eq('id', agentId)
      .single();
    
    if (updatedAgent?.status !== 'suspended') throw new Error('Revocation failed');
    console.log('✅ Status Lifecycle Verified.');

    console.log('\n--- ALL S6 IDENTITY TESTS PASSED ---');

  } catch (error: any) {
    console.error('❌ S6 Test Failed:', error.message);
    process.exit(1);
  }
}

runS6Tests();
