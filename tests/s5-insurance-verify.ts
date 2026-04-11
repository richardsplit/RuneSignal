import { RiskEngine } from '../lib/modules/s5-insurance/risk-engine';
import { AuditLedgerService } from '../lib/ledger/service';
import { createAdminClient } from '../lib/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

async function runS5Tests() {
  const tenantId = process.env.TEST_TENANT_ID || 'test-tenant-id';
  const agentId = uuidv4();
  const supabase = createAdminClient();

  console.log('--- STARTING S5 INSURANCE TESTS ---');

  try {
    // 1. Setup: Ensure tenant and agent exist
    await supabase.from('tenants').upsert({ id: tenantId, name: 'S5 Actuarial Corp' });
    await supabase.from('agent_credentials').upsert({
      id: agentId,
      tenant_id: tenantId,
      agent_name: 'S5_Verify_Agent',
      agent_type: 'finance',
      framework: 'custom',
      public_key: 'test_key',
      status: 'active'
    });

    // 2. Setup: Base Coverage Policy
    await supabase.from('coverage_policies').upsert({
      tenant_id: tenantId,
      plan_name: 'Enterprise Protection Plan',
      max_liability_limit: 1000000,
      deductible: 5000,
      base_premium: 500,
      status: 'active'
    });

    // 3. Test: Emit Violations
    console.log('Emitting simulated security violations...');
    for (let i = 0; i < 5; i++) {
      await AuditLedgerService.appendEvent({
        event_type: 'agent.permission_violation',
        module: 's1',
        tenant_id: tenantId,
        agent_id: agentId,
        request_id: uuidv4(),
        payload: { resource: 'restricted_db', action: 'read' }
      });
    }

    // 4. Test: Risk Score Calculation
    console.log('Testing Risk Score Aggregation...');
    const profile = await RiskEngine.refreshAgentRiskProfile(tenantId, agentId);
    console.log(`✅ Risk Profile Created: Score=${profile.risk_score}, Violations=${profile.total_violations}`);
    
    // 5 violations * 5 pts each + 10 base = 35
    if (profile.risk_score < 30) throw new Error(`Risk score too low: ${profile.risk_score}`);
    console.log('✅ Risk Aggregation Verified.');

    // 5. Test: Premium Calculation
    console.log('Testing Dynamic Premium Calculation...');
    const premiumData = await RiskEngine.calculatePremium(tenantId, agentId);
    console.log(`✅ Premium Calculated: $${premiumData.final_premium} (Multiplier: ${premiumData.risk_multiplier}x)`);
    
    // Risk score 35 should have 1.5x multiplier -> $750
    if (premiumData.final_premium !== 750) throw new Error(`Premium mismatch: ${premiumData.final_premium}`);
    console.log('✅ Actuarial Pricing Verified.');

    // 6. Test: Claims Filing
    console.log('Testing Claims Filing...');
    const { data: claim, error: claimErr } = await supabase
      .from('insurance_claims')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        incident_type: 'Unauthorized Data Retrieval',
        financial_impact: 12000,
        description: 'Agent breached database isolation during load test.',
        status: 'filed'
      })
      .select()
      .single();

    if (claimErr) throw new Error(claimErr.message);
    console.log(`✅ Claim Filed: ${claim.id.split('-')[0]} [${claim.status}]`);
    
    const { data: fetchClaim } = await supabase
      .from('insurance_claims')
      .select('*')
      .eq('id', claim.id)
      .single();
    
    if (fetchClaim.financial_impact !== 12000) throw new Error('Claim data integrity check failed');
    console.log('✅ Claims Ledger Persistence Verified.');

    console.log('\n--- ALL S5 INSURANCE TESTS PASSED ---');

  } catch (error: any) {
    console.error('❌ S5 Test Failed:', error.message);
    process.exit(1);
  }
}

runS5Tests();
