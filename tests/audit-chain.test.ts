import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient } from '../lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import { IdentityService } from '../lib/modules/s6-identity/service';
import { ArbiterService } from '../lib/modules/s1-conflict/service';
import { CertificateService } from '../lib/modules/s3-provenance/certificate';
import { HitlService } from '../lib/modules/s7-hitl/service';

describe('RuneSignal 5-Event Audit Chain', () => {
  const tenantId = uuidv4();
  let agentId: string;
  let ticketId: string;

  beforeAll(async () => {
    const supabase = createAdminClient();
    // Setup test tenant
    await supabase.from('tenants').insert({ 
      id: tenantId, 
      name: `Vitest Audit Chain ${tenantId.slice(0, 8)}` 
    });
  });

  it('Step 1: should successfully register a new agent', async () => {
    const { agent } = await IdentityService.registerAgent(tenantId, { 
      agent_name: 'VitestTester', 
      agent_type: 'custom' 
    });
    expect(agent).toBeDefined();
    expect(agent.id).toBeDefined();
    agentId = agent.id;
  });

  it('Step 2: should successfully mediate an intent with resource locking', async () => {
    const result = await ArbiterService.mediateIntent(tenantId, agentId, { 
      intent_description: 'Access secure financial mainframe',
      resource_name: 'vitest:resource:001'
    });
    expect(result.decision).toBe('allow');
  });

  it('Step 3: should certify an AI call with I/O hashing', async () => {
    await CertificateService.certifyCall(tenantId, agentId, {
      provider: 'openai',
      model: 'gpt-4o',
      input_hash: 'vh1',
      output_hash: 'vh2',
      completion_text: 'Vitest Verified',
      user_messages: [{ role: 'user', content: 'Test verify' }]
    });
    // If no error thrown, it's successful
  });

  it('Step 4: should create a HITL exception for unmapped protocols', async () => {
    const ticket = await HitlService.createException(tenantId, agentId, {
      title: 'Vitest Exception',
      description: 'Triggered during vitest run',
      priority: 'medium'
    });
    expect(ticket).toBeDefined();
    expect(ticket.status).toBe('open');
    ticketId = ticket.id;
  });

  it('Step 5: should resolve exception and trigger training pipeline', async () => {
    const ticket = await HitlService.resolveException(tenantId, ticketId, { 
      action: 'approve', 
      reason: 'Vitest approved', 
      reviewer_id: '00000000-0000-0000-0000-000000000000' 
    });
    expect(ticket.status).toBe('approved');
  });

  it('Final Verification: should have 5 core events in the immutable ledger', async () => {
    const supabase = createAdminClient();
    
    // Allow for eventual consistency
    await new Promise(r => setTimeout(r, 1500));

    const { data: events, count } = await supabase
      .from('audit_events')
      .select('event_type', { count: 'exact' })
      .eq('tenant_id', tenantId);

    console.log('Detected Event Chain:', events?.map(e => e.event_type));
    expect(count).toBeGreaterThanOrEqual(5);
  }, 10000); // Higher timeout
});
