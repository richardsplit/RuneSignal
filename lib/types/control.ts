/**
 * Control types for Phase 4 — Compliance Controls Framework
 * EU AI Act Articles 9, 13, 14, 15, 26 — Continuous monitoring controls
 * ISO 42001 Clause 8.2 — Operational planning and control
 */

export type ControlStatus = 'passing' | 'failing' | 'warning' | 'not_evaluated';
export type EvaluationType = 'real_time' | 'scheduled' | 'manual';
export type ControlSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EvaluationResult = 'pass' | 'fail' | 'warning' | 'error';

export interface Control {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  regulation: string | null;
  clause_ref: string | null;
  policy_id: string | null;
  evaluation_type: EvaluationType;
  evaluation_query: EvaluationQuery | null;
  evaluation_schedule: string | null;
  status: ControlStatus;
  last_evaluated_at: string | null;
  consecutive_failures: number;
  severity: ControlSeverity;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationQuery {
  table: string;
  condition: string;
  threshold: number;
  comparison: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
}

export interface ControlEvaluation {
  id: string;
  control_id: string;
  tenant_id: string;
  result: EvaluationResult;
  detail: Record<string, unknown>;
  evaluated_at: string;
}

export interface CreateControlParams {
  name: string;
  description?: string;
  regulation?: string;
  clause_ref?: string;
  policy_id?: string;
  evaluation_type?: EvaluationType;
  evaluation_query?: EvaluationQuery;
  evaluation_schedule?: string;
  severity?: ControlSeverity;
  owner?: string;
}

export interface ControlFilters {
  status?: ControlStatus;
  regulation?: string;
  severity?: ControlSeverity;
  evaluation_type?: EvaluationType;
  limit?: number;
  offset?: number;
}

export interface ControlStatusSummary {
  total: number;
  passing: number;
  failing: number;
  warning: number;
  not_evaluated: number;
  by_regulation: Record<string, { passing: number; failing: number; warning: number }>;
}
