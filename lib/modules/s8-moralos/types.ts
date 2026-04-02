export interface CorporateSoul {
  financial: {
    transaction_limit_usd: number;
    anomaly_multiplier_threshold: number;
    require_cfo_above_usd: number;
    blocked_vendor_categories: string[];
  };
  compliance: {
    frameworks: string[];
    data_residency_regions: string[];
    retention_rules: Record<string, number>;
    require_dpo_for_deletion: boolean;
  };
  sensitive_data: {
    classification_levels: string[];
    blocked_external_domains: string[];
    ip_protection_paths: string[];
    pii_handling: 'strict' | 'standard';
  };
  security: {
    no_self_privilege_escalation: boolean;
    require_approval_for_prod_deploy: boolean;
    blocked_network_egress: string[];
    max_credential_scope: string;
  };
  authority: {
    role_permissions: Record<string, string[]>;
    delegation_depth: number;
    require_manager_oob_for: string[];
    require_ciso_for: string[];
  };
}

export interface MoralVerdict {
  verdict: 'clear' | 'pause' | 'block';
  domain: string;
  conflict_reason?: string;
  escalate_to?: 'manager' | 'cfo' | 'ciso' | 'dpo';
  soul_version: number;
}

export interface EvaluateMoralRequest {
  agent_id: string;
  action_description: string;
  domain: string;
  action_metadata: Record<string, unknown>;
}

export interface MoralProfile {
  id: string;
  tenant_id: string;
  version: number;
  soul_json: CorporateSoul;
  signature: string;
  signed_by: string;
  is_active: boolean;
  created_at: string;
}

export interface MoralEvent {
  id: string;
  tenant_id: string;
  agent_id: string;
  action_description: string;
  domain: string;
  verdict: 'clear' | 'pause' | 'block';
  conflict_reason?: string;
  soul_version: number;
  oob_ticket_id?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// Maps robo-* agent types to their default moral domain
export const ROBO_DOMAIN_MAP: Record<string, string> = {
  'robo-finance': 'finance',
  'robo-compliance': 'compliance',
  'robo-engineering': 'security',
  'robo-security': 'security',
  'robo-training': 'ops',
  'robo-ops': 'comms',
};
