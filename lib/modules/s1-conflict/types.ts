export interface AgentIntent {
  id: string;
  tenant_id: string;
  agent_id: string;
  intent_description: string;
  embedding?: number[];
  status: 'pending' | 'allowed' | 'blocked' | 'completed';
  metadata: Record<string, any>;
  expires_at: string;
  created_at: string;
}

export interface ConflictPolicy {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  intent_category: string;
  policy_action: 'block' | 'queue' | 'alert';
  embedding?: number[];
  created_at: string;
}

export interface RegisterIntentRequest {
  intent_description: string;
  resource_name?: string; // Optional: Exact-match resource identifier for locking
  metadata?: Record<string, any>;
  ttl_seconds?: number;
  vendor?: 'openai' | 'claude';
}

export interface ArbiterResponse {
  decision: 'allow' | 'block' | 'queue';
  reason: string;
  conflict_id?: string;
  suggested_action?: string;
}
