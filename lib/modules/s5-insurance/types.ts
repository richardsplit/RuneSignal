export interface CoveragePolicy {
  id: string;
  tenant_id: string;
  plan_name: string;
  max_liability_limit: number;
  deductible: number;
  base_premium: number;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface AgentRiskProfile {
  id?: string;
  tenant_id: string;
  agent_id: string;
  risk_score: number; // 0-100
  total_violations: number;
  hitl_escalations: number;
  model_version_anomalies: number;
  moral_conflicts?: number;
  last_computed_at: string;
}

export interface InsuranceClaim {
  id: string;
  tenant_id: string;
  agent_id: string;
  incident_type: string;
  financial_impact: number;
  description: string;
  status: 'filed' | 'investigating' | 'approved' | 'denied';
  filed_at: string;
  resolved_at?: string;
}

export interface CalculatePremiumRequest {
  agent_id: string;
}

export interface PremiumCalculationResponse {
  agent_id: string;
  base_premium: number;
  risk_multiplier: number;
  final_premium: number;
  risk_score: number;
  risk_factors: string[];
}
