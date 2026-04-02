export interface AgentCredential {
  id: string;
  tenant_id: string;
  agent_name: string;
  agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom' | 'finance' | 'orchestrator' | 'robo-finance' | 'robo-compliance' | 'robo-engineering' | 'robo-security' | 'robo-training' | 'robo-ops';
  framework?: string;
  public_key?: string;
  status: 'active' | 'suspended' | 'revoked';
  created_by?: string;
  created_at: string;
  last_seen_at?: string;
  metadata?: Record<string, any>;
}

export interface PermissionScope {
  id: string;
  agent_id: string;
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
  expires_at?: string;
  granted_by?: string;
  created_at: string;
}

export interface RegisterAgentRequest {
  agent_name: string;
  agent_type: 'langgraph' | 'mcp' | 'crewai' | 'custom' | 'finance' | 'orchestrator' | 'robo-finance' | 'robo-compliance' | 'robo-engineering' | 'robo-security' | 'robo-training' | 'robo-ops';
  framework?: string;
  public_key?: string;
  scopes?: {
    resource: string;
    actions: string[];
    conditions?: Record<string, any>;
  }[];
  metadata?: Record<string, any>;
}

export interface EnforceToolCallRequest {
  agent_id: string;
  tool_name: string;
  arguments: Record<string, any>;
}
