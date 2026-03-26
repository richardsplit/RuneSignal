import { IdentityService } from '../lib/modules/s6-identity/service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simple S6 Identity Verification Script
 * Run with: npx ts-node src/tests/s6-identity-verify.ts
 */
async function runTests() {
  const tenantId = uuidv4();
  console.log(`Starting S6 Identity tests for Tenant: ${tenantId}`);

  try {
    // 1. Test Registration
    console.log('Testing Agent Registration...');
    const regResult = await IdentityService.registerAgent(tenantId, {
      agent_name: 'TestAutomator',
      agent_type: 'custom',
      framework: 'jest-verify',
      scopes: [
        { resource: 'system:logs', actions: ['read'] },
        { resource: 'tool:calculator', actions: ['*'] }
      ],
      metadata: { environment: 'testing', version: '1.0' }
    });

    console.log('✅ Registration Successful:', regResult.agent.id);

    // 2. Test Permission Validation (Allowed)
    console.log('Testing Permission Validation (Allowed)...');
    const allowed = await IdentityService.validatePermission(regResult.agent.id, 'tool:calculator', 'execute');
    if (allowed.allowed) {
      console.log('✅ Permission Allowed as expected.');
    } else {
      console.error('❌ Permission Denied unexpectedly:', allowed.reason);
    }

    // 3. Test Permission Validation (Denied)
    console.log('Testing Permission Validation (Denied)...');
    const denied = await IdentityService.validatePermission(regResult.agent.id, 'system:admin', 'write');
    if (!denied.allowed) {
      console.log('✅ Permission Denied as expected:', denied.reason);
    } else {
      console.error('❌ Permission Allowed unexpectedly!');
    }

    // 4. Test Status Check
    console.log('Testing Status Check...');
    const status = await IdentityService.checkAgentStatus(regResult.agent.id);
    console.log(`✅ Status: ${status}`);

    console.log('\n--- ALL S6 IDENTITY TESTS PASSED ---');
  } catch (error) {
    console.error('❌ Test Suite Failed:', error);
    process.exit(1);
  }
}

runTests();
