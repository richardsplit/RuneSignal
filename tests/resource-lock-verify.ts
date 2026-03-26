import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { v4 as uuidv4 } from 'uuid';
import { IdentityService } from '../lib/modules/s6-identity/service';
import { ArbiterService } from '../lib/modules/s1-conflict/service';
import { createAdminClient } from '../lib/db/supabase';

/**
 * Resource Lock Verification Test
 * 
 * Validates that the ArbiterService correctly blocks concurrent access
 * to the same resource by different agents, regardless of semantic similarity.
 */
async function runTest() {
  console.log('🚀 Starting Resource Lock Verification...');
  
  const tenantId = uuidv4();
  const supabase = createAdminClient();
  const resourceName = `inventory:SKU-${Math.floor(Math.random() * 10000)}`;

  await supabase.from('tenants').insert({ id: tenantId, name: `Lock Test ${tenantId.slice(0, 8)}` });

  try {
    // 1. Register Two Agents
    console.log('Registering agents...');
    const { agent: agentA } = await IdentityService.registerAgent(tenantId, { agent_name: 'AgentA', agent_type: 'custom' });
    const { agent: agentB } = await IdentityService.registerAgent(tenantId, { agent_name: 'AgentB', agent_type: 'custom' });

    // 2. Agent A acquires lock
    console.log(`Agent A requesting access to ${resourceName}...`);
    const resA = await ArbiterService.mediateIntent(tenantId, agentA.id, {
      intent_description: 'I am accessing the inventory database to check stock.',
      resource_name: resourceName,
      ttl_seconds: 60
    });

    if (resA.decision !== 'allow') {
      throw new Error(`Agent A failed to acquire lock: ${resA.reason}`);
    }
    console.log('✅ Agent A allowed.');

    // 3. Agent B attempts access with different wording but SAME resource_name
    console.log(`Agent B requesting access to ${resourceName} with different intent string...`);
    const resB = await ArbiterService.mediateIntent(tenantId, agentB.id, {
      intent_description: 'Updating the parts catalog for the server farm.',
      resource_name: resourceName
    });

    if (resB.decision === 'block' && resB.reason.includes('Resource Conflict')) {
      console.log('✅ Agent B correctly BLOCKED due to resource conflict.');
    } else {
      throw new Error(`Agent B was NOT blocked! Decision: ${resB.decision}, Reason: ${resB.reason}`);
    }

    // 4. Agent A attempts access again (should be allowed, it's their own lock)
    console.log('Agent A requesting access to the same resource again...');
    const resA2 = await ArbiterService.mediateIntent(tenantId, agentA.id, {
      intent_description: 'Checking stock again.',
      resource_name: resourceName
    });

    if (resA2.decision === 'allow') {
      console.log('✅ Agent A allowed to re-access their own resource.');
    } else {
      throw new Error(`Agent A was blocked from their own resource! Decision: ${resA2.decision}`);
    }

    console.log('\n🏆 RESOURCE LOCK VERIFICATION PASSED.');

  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

runTest();
