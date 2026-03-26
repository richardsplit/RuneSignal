import { HitlService } from '../lib/modules/s7-hitl/service';
import { createAdminClient } from '../lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

async function runS7Tests() {
  const tenantId = '7da27c93-6889-4fda-8b22-df4689fbbcd6'; // Use a consistent test tenant ID
  const agentId = uuidv4();
  const supabase = createAdminClient();

  console.log('--- STARTING S7 HITL TESTS ---');

  try {
    // 1. Setup: Ensure tenant exists
    await supabase.from('tenants').upsert({ id: tenantId, name: 'S7 Verification Corp' });
    
    // Ensure agent exists
    await supabase.from('agent_credentials').upsert({
      id: agentId,
      tenant_id: tenantId,
      agent_name: 'S7_Verify_Agent',
      agent_type: 'mcp',
      framework: 'custom',
      public_key: 'test_key',
      status: 'active'
    });
    
    // 2. Test: Create Exception
    console.log('Testing Exception Creation...');
    const ticket = await HitlService.createException(tenantId, agentId, {
      title: 'High-Value Refund Request',
      description: 'Agent requested a refund of $12,500 which exceeds the $5,000 threshold.',
      priority: 'high',
      context_data: {
        order_id: 'ORD-9921',
        customer_tier: 'platinum'
      }
    });
    console.log(`✅ Ticket Created: ${ticket.id} [${ticket.status}]`);

    // 3. Test: Verify in DB
    const { data: fetchTicket } = await supabase
      .from('hitl_exceptions')
      .select('*')
      .eq('id', ticket.id)
      .single();
    
    if (!fetchTicket || fetchTicket.priority !== 'high') {
       throw new Error('Ticket not correctly persisted in database');
    }
    console.log('✅ DB Persistence Verified.');

    // 4. Test: Resolve Exception
    console.log('Testing Exception Resolution (Approve)...');
    const resolved = await HitlService.resolveException(tenantId, ticket.id, {
      action: 'approve',
      reason: 'Verified customer platinum status and order history.',
      reviewer_id: uuidv4() // Use a valid UUID
    });
    console.log(`✅ Ticket Resolved: ${resolved.id} [${resolved.status}]`);
    if (resolved.status !== 'approved') throw new Error('Resolution failed');

    // 5. Test: SLA Escalation (Mocking an old ticket)
    console.log('Testing SLA Escalation logic...');
    const oldTicketId = uuidv4();
    await supabase.from('hitl_exceptions').insert({
      id: oldTicketId,
      tenant_id: tenantId,
      agent_id: agentId,
      title: 'Expired Ticket Test',
      description: 'This ticket should be escalated.',
      priority: 'medium',
      status: 'open',
      sla_deadline: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    });

    const escalatedCount = await HitlService.checkSlas(tenantId);
    console.log(`✅ SLA Check completed. Escalated ${escalatedCount} tickets.`);
    
    const { data: escalatedTicket } = await supabase
      .from('hitl_exceptions')
      .select('status')
      .eq('id', oldTicketId)
      .single();
    
    if (escalatedTicket?.status !== 'escalated') throw new Error('Escalation logic failed');
    console.log('✅ Escalation Logic Verified.');

    console.log('\n--- ALL S7 HITL TESTS PASSED ---');

  } catch (error: any) {
    console.error('❌ S7 Test Failed:', error.message);
    process.exit(1);
  }
}

runS7Tests();
