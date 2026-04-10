/**
 * Pre-built Salesforce Plugin
 *
 * Trigger: S5 insurance claim filed / state changed
 * Action: Create or update a Salesforce Case via the Salesforce REST API.
 *         Syncs claim state transitions bidirectionally.
 *
 * Installation:
 *   endpoint_url = https://<instance>.salesforce.com/services/data/v58.0/sobjects/Case
 *   auth_header = Authorization: Bearer <oauth_access_token>
 */

export const SALESFORCE_PLUGIN_TEMPLATE = {
  name: 'Salesforce — Insurance Case Sync',
  description:
    'Creates and updates Salesforce Cases from RuneSignal insurance claim events. Syncs claim state transitions (FNOL → triaged → investigating → decided → paid/denied) in real time.',
  plugin_type: 'connector',
  category: 'crm',
  icon: '☁️',
  triggers: [
    'insurance.claim.created',
    'insurance.claim.state_changed',
    'insurance.claim.pending_hitl',
    'insurance.claim.decided',
    'insurance.claim.paid',
    'insurance.claim.denied',
  ],
  retry_count: 3,
  timeout_ms: 10000,
};

/**
 * Formats a RuneSignal insurance claim event into a Salesforce Case object.
 */
export function buildSalesforceCase(event: {
  event_type: string;
  payload: Record<string, any>;
}): Record<string, any> {
  const p = event.payload;

  const statusMap: Record<string, string> = {
    'insurance.claim.created': 'New',
    'insurance.claim.state_changed': 'In Progress',
    'insurance.claim.pending_hitl': 'Escalated',
    'insurance.claim.decided': 'Pending Customer',
    'insurance.claim.paid': 'Closed',
    'insurance.claim.denied': 'Closed',
  };

  return {
    Subject: `Insurance Claim ${p.claim_id?.slice(0, 8) || 'New'} — ${p.claim_type || 'General'}`,
    Description: `RuneSignal Claim ID: ${p.claim_id}\nState: ${p.claim_state || 'fnol'}\nFinancial Impact: $${p.financial_impact || 0}\nFraud Score: ${p.fraud_score || 0}`,
    Status: statusMap[event.event_type] || 'In Progress',
    Priority: (p.financial_impact || 0) > 50000 ? 'High' : 'Medium',
    Origin: 'RuneSignal AI',
    Type: 'Insurance Claim',
    // Custom fields (requires Salesforce admin setup)
    RuneSignal_Claim_ID__c: p.claim_id,
    RuneSignal_State__c: p.claim_state,
    RuneSignal_Fraud_Score__c: p.fraud_score,
    RuneSignal_Financial_Impact__c: p.financial_impact,
  };
}
