/**
 * ControlService — Compliance controls with evaluation engine.
 *
 * EU AI Act Articles 9, 13, 14, 15, 26 — Continuous compliance monitoring
 * ISO 42001 Clause 8.2 — Operational planning and control
 *
 * Phase 4 Task 4.1.2
 */

import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '@lib/ledger/service';
import { v4 as uuidv4 } from 'uuid';
import type {
  Control,
  ControlEvaluation,
  ControlFilters,
  ControlStatusSummary,
  CreateControlParams,
  EvaluationQuery,
  EvaluationResult,
  EvaluationType,
} from '@lib/types/control';

/** Tables allowed in evaluation queries — prevents SQL injection. */
const ALLOWED_TABLES = [
  'hitl_exceptions',
  'audit_events',
  'agent_credentials',
  'anomaly_events',
  'firewall_evaluations',
  'incidents',
  'compliance_reports',
  'control_evaluations',
];

/** Built-in control templates seeded on first use. */
const DEFAULT_CONTROLS: CreateControlParams[] = [
  {
    name: 'HITL SLA Compliance',
    description: 'Monitors for SLA breaches on human-in-the-loop approval requests',
    regulation: 'eu_ai_act',
    clause_ref: 'article_14',
    evaluation_type: 'scheduled',
    evaluation_query: {
      table: 'hitl_exceptions',
      condition: "status = 'open' AND sla_deadline < NOW()",
      threshold: 0,
      comparison: 'gt',
    },
    severity: 'high',
  },
  {
    name: 'Audit Signing Coverage',
    description: 'Ensures >95% of audit events have valid cryptographic signatures',
    regulation: 'eu_ai_act',
    clause_ref: 'article_13',
    evaluation_type: 'scheduled',
    evaluation_query: {
      table: 'audit_events',
      condition: "signature IS NULL AND created_at > NOW() - INTERVAL '24 hours'",
      threshold: 5,
      comparison: 'gt',
    },
    severity: 'high',
  },
  {
    name: 'Agent Inventory Currency',
    description: 'Checks that all registered agents have been seen within 30 days',
    regulation: 'eu_ai_act',
    clause_ref: 'article_26',
    evaluation_type: 'scheduled',
    evaluation_query: {
      table: 'agent_credentials',
      condition: "last_seen_at < NOW() - INTERVAL '30 days' OR last_seen_at IS NULL",
      threshold: 0,
      comparison: 'gt',
    },
    severity: 'medium',
  },
  {
    name: 'Anomaly Response Time',
    description: 'Monitors for anomalies unresolved for more than 24 hours',
    regulation: 'eu_ai_act',
    clause_ref: 'article_15',
    evaluation_type: 'scheduled',
    evaluation_query: {
      table: 'anomaly_events',
      condition: "resolved_at IS NULL AND created_at < NOW() - INTERVAL '24 hours'",
      threshold: 0,
      comparison: 'gt',
    },
    severity: 'high',
  },
  {
    name: 'Policy Evaluation Uptime',
    description: 'Checks for firewall evaluation errors in the last hour',
    regulation: 'eu_ai_act',
    clause_ref: 'article_9',
    evaluation_type: 'scheduled',
    evaluation_query: {
      table: 'firewall_evaluations',
      // NOTE: actual column is 'verdict', not 'result' per schema inspection
      condition: "verdict = 'error' AND created_at > NOW() - INTERVAL '1 hour'",
      threshold: 0,
      comparison: 'gt',
    },
    severity: 'critical',
  },
];

export class ControlService {
  /**
   * Create a new control.
   */
  static async create(tenant_id: string, params: CreateControlParams): Promise<Control> {
    const supabase = createAdminClient();
    const id = uuidv4();
    const now = new Date().toISOString();

    if (params.evaluation_query) {
      ControlService.validateEvaluationQuery(params.evaluation_query);
    }

    const { data, error } = await supabase
      .from('controls')
      .insert({
        id,
        tenant_id,
        name: params.name,
        description: params.description || null,
        regulation: params.regulation || null,
        clause_ref: params.clause_ref || null,
        policy_id: params.policy_id || null,
        evaluation_type: params.evaluation_type || 'scheduled',
        evaluation_query: params.evaluation_query || null,
        evaluation_schedule: params.evaluation_schedule || null,
        severity: params.severity || 'medium',
        owner: params.owner || null,
        status: 'not_evaluated',
        consecutive_failures: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create control: ${error.message}`);

    await AuditLedgerService.appendEvent({
      event_type: 'control.created',
      module: 'system',
      tenant_id,
      request_id: id,
      payload: { control_id: id, name: params.name, regulation: params.regulation || null },
    });

    return data as Control;
  }

  /**
   * Update an existing control.
   */
  static async update(
    tenant_id: string,
    control_id: string,
    params: Partial<CreateControlParams>,
  ): Promise<Control> {
    const supabase = createAdminClient();

    if (params.evaluation_query) {
      ControlService.validateEvaluationQuery(params.evaluation_query);
    }

    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (params.name !== undefined) updateFields.name = params.name;
    if (params.description !== undefined) updateFields.description = params.description || null;
    if (params.regulation !== undefined) updateFields.regulation = params.regulation || null;
    if (params.clause_ref !== undefined) updateFields.clause_ref = params.clause_ref || null;
    if (params.policy_id !== undefined) updateFields.policy_id = params.policy_id || null;
    if (params.evaluation_type !== undefined) updateFields.evaluation_type = params.evaluation_type;
    if (params.evaluation_query !== undefined) updateFields.evaluation_query = params.evaluation_query || null;
    if (params.evaluation_schedule !== undefined) updateFields.evaluation_schedule = params.evaluation_schedule || null;
    if (params.severity !== undefined) updateFields.severity = params.severity;
    if (params.owner !== undefined) updateFields.owner = params.owner || null;

    const { data, error } = await supabase
      .from('controls')
      .update(updateFields)
      .eq('id', control_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update control: ${error.message}`);

    await AuditLedgerService.appendEvent({
      event_type: 'control.updated',
      module: 'system',
      tenant_id,
      request_id: control_id,
      payload: { control_id, updated_fields: Object.keys(updateFields).filter(k => k !== 'updated_at') },
    });

    return data as Control;
  }

  /**
   * Get a single control by ID (tenant-scoped).
   */
  static async getById(tenant_id: string, control_id: string): Promise<Control | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('controls')
      .select('*')
      .eq('id', control_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error) return null;
    return data as Control;
  }

  /**
   * List controls with optional filters and pagination.
   */
  static async list(
    tenant_id: string,
    filters?: ControlFilters,
  ): Promise<{ controls: Control[]; total: number }> {
    const supabase = createAdminClient();
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    let query = supabase
      .from('controls')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.regulation) query = query.eq('regulation', filters.regulation);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.evaluation_type) query = query.eq('evaluation_type', filters.evaluation_type);

    const { data, error, count } = await query;

    if (error) throw new Error(`Failed to list controls: ${error.message}`);

    return {
      controls: (data || []) as Control[],
      total: count ?? 0,
    };
  }

  /**
   * Delete a control (tenant-scoped).
   */
  static async delete(tenant_id: string, control_id: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('controls')
      .delete()
      .eq('id', control_id)
      .eq('tenant_id', tenant_id);

    if (error) throw new Error(`Failed to delete control: ${error.message}`);

    await AuditLedgerService.appendEvent({
      event_type: 'control.deleted',
      module: 'system',
      tenant_id,
      request_id: control_id,
      payload: { control_id },
    });
  }

  /**
   * Evaluate a single control. Runs evaluation_query against the database,
   * compares result count to threshold, and produces pass/fail/warning.
   * Persists result in control_evaluations. Updates control status.
   */
  static async evaluate(tenant_id: string, control_id: string): Promise<ControlEvaluation> {
    const supabase = createAdminClient();

    // 1. Load the control
    const control = await ControlService.getById(tenant_id, control_id);
    if (!control) throw new Error('Control not found');

    const evalId = uuidv4();
    const now = new Date().toISOString();

    // 2. If no evaluation_query, return error
    if (!control.evaluation_query) {
      const evaluation = await ControlService.persistEvaluation(supabase, {
        id: evalId,
        control_id,
        tenant_id,
        result: 'error',
        detail: { reason: 'no evaluation query' },
        evaluated_at: now,
      });
      await ControlService.updateControlStatus(supabase, control, 'error', now);
      return evaluation;
    }

    const query = control.evaluation_query;

    // 3. Validate table name
    if (!ALLOWED_TABLES.includes(query.table)) {
      const evaluation = await ControlService.persistEvaluation(supabase, {
        id: evalId,
        control_id,
        tenant_id,
        result: 'error',
        detail: { reason: `table '${query.table}' not in allowed list` },
        evaluated_at: now,
      });
      await ControlService.updateControlStatus(supabase, control, 'error', now);
      return evaluation;
    }

    // 4. Run the count query via RPC or raw SQL
    let count = 0;
    try {
      const { data: countData, error: countError } = await supabase.rpc('eval_control_count', {
        p_table: query.table,
        p_tenant_id: tenant_id,
        p_condition: query.condition,
      });

      if (countError) {
        // Fallback: use Supabase query builder for simple conditions
        // If RPC not available, record error
        const evaluation = await ControlService.persistEvaluation(supabase, {
          id: evalId,
          control_id,
          tenant_id,
          result: 'error',
          detail: { reason: `evaluation query failed: ${countError.message}` },
          evaluated_at: now,
        });
        await ControlService.updateControlStatus(supabase, control, 'error', now);
        return evaluation;
      }
      count = typeof countData === 'number' ? countData : 0;
    } catch (err) {
      const evaluation = await ControlService.persistEvaluation(supabase, {
        id: evalId,
        control_id,
        tenant_id,
        result: 'error',
        detail: { reason: `evaluation exception: ${err instanceof Error ? err.message : String(err)}` },
        evaluated_at: now,
      });
      await ControlService.updateControlStatus(supabase, control, 'error', now);
      return evaluation;
    }

    // 5. Compare count vs threshold
    const thresholdMet = ControlService.compareThreshold(count, query.threshold, query.comparison);

    // 6. Determine result: fail if threshold met, warning if within 80%, pass otherwise
    let result: EvaluationResult;
    if (thresholdMet) {
      result = 'fail';
    } else if (query.comparison === 'gt' || query.comparison === 'gte') {
      // Warning if count is >= 80% of threshold
      const warningThreshold = query.threshold * 0.8;
      result = count >= warningThreshold && query.threshold > 0 ? 'warning' : 'pass';
    } else {
      result = 'pass';
    }

    // 7. Persist evaluation
    const evaluation = await ControlService.persistEvaluation(supabase, {
      id: evalId,
      control_id,
      tenant_id,
      result,
      detail: { count, threshold: query.threshold, comparison: query.comparison, table: query.table },
      evaluated_at: now,
    });

    // 8. Update control status
    await ControlService.updateControlStatus(supabase, control, result, now);

    // 9. Audit ledger
    await AuditLedgerService.appendEvent({
      event_type: 'control.evaluated',
      module: 'system',
      tenant_id,
      request_id: control_id,
      payload: { control_id, result, count, threshold: query.threshold },
    });

    return evaluation;
  }

  /**
   * Evaluate all controls for a tenant (optionally filtered by evaluation_type).
   */
  static async evaluateAll(
    tenant_id: string,
    evaluation_type?: EvaluationType,
  ): Promise<ControlEvaluation[]> {
    const supabase = createAdminClient();

    let query = supabase
      .from('controls')
      .select('id')
      .eq('tenant_id', tenant_id);

    if (evaluation_type) {
      query = query.eq('evaluation_type', evaluation_type);
    }

    const { data: controls, error } = await query;
    if (error) throw new Error(`Failed to list controls for evaluation: ${error.message}`);

    const results: ControlEvaluation[] = [];
    for (const c of controls || []) {
      try {
        const evaluation = await ControlService.evaluate(tenant_id, c.id);
        results.push(evaluation);
      } catch (err) {
        console.error(`[ControlService] Failed to evaluate control ${c.id}:`, err);
      }
    }

    return results;
  }

  /**
   * Get aggregated status summary for dashboard.
   */
  static async getStatus(tenant_id: string): Promise<ControlStatusSummary> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('controls')
      .select('status, regulation')
      .eq('tenant_id', tenant_id);

    if (error) throw new Error(`Failed to get control status: ${error.message}`);

    const controls = data || [];
    const summary: ControlStatusSummary = {
      total: controls.length,
      passing: 0,
      failing: 0,
      warning: 0,
      not_evaluated: 0,
      by_regulation: {},
    };

    for (const c of controls) {
      const status = c.status as keyof Pick<ControlStatusSummary, 'passing' | 'failing' | 'warning' | 'not_evaluated'>;
      if (status in summary && typeof summary[status] === 'number') {
        (summary[status] as number) += 1;
      }

      if (c.regulation) {
        if (!summary.by_regulation[c.regulation]) {
          summary.by_regulation[c.regulation] = { passing: 0, failing: 0, warning: 0 };
        }
        const reg = summary.by_regulation[c.regulation];
        if (c.status === 'passing') reg.passing += 1;
        else if (c.status === 'failing') reg.failing += 1;
        else if (c.status === 'warning') reg.warning += 1;
      }
    }

    return summary;
  }

  /**
   * Idempotently seeds the built-in DEFAULT_CONTROLS for a tenant.
   * Skips any control whose name already exists for that tenant.
   * Returns { seeded, skipped } counts.
   */
  static async seedDefaults(tenant_id: string): Promise<{ seeded: number; skipped: number }> {
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('controls')
      .select('name')
      .eq('tenant_id', tenant_id);

    const existingNames = new Set((existing || []).map((c: { name: string }) => c.name));

    let seeded = 0;
    let skipped = 0;

    for (const template of DEFAULT_CONTROLS) {
      if (existingNames.has(template.name)) {
        skipped++;
        continue;
      }
      try {
        await ControlService.create(tenant_id, template);
        seeded++;
      } catch (err) {
        console.error(`[ControlService.seedDefaults] Failed to seed "${template.name}":`, err);
      }
    }

    await AuditLedgerService.appendEvent({
      event_type: 'controls.seeded',
      module: 'system',
      tenant_id,
      payload: { seeded, skipped, total: DEFAULT_CONTROLS.length },
    });

    return { seeded, skipped };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private static validateEvaluationQuery(query: EvaluationQuery): void {
    if (!ALLOWED_TABLES.includes(query.table)) {
      throw new Error(`Invalid evaluation query: table '${query.table}' is not allowed`);
    }
    if (typeof query.threshold !== 'number' || query.threshold < 0) {
      throw new Error('Invalid evaluation query: threshold must be a non-negative number');
    }
    const validComparisons = ['gt', 'gte', 'lt', 'lte', 'eq'];
    if (!validComparisons.includes(query.comparison)) {
      throw new Error(`Invalid evaluation query: comparison must be one of ${validComparisons.join(', ')}`);
    }
  }

  private static compareThreshold(count: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'gt': return count > threshold;
      case 'gte': return count >= threshold;
      case 'lt': return count < threshold;
      case 'lte': return count <= threshold;
      case 'eq': return count === threshold;
      default: return false;
    }
  }

  private static async persistEvaluation(
    supabase: ReturnType<typeof createAdminClient>,
    evaluation: ControlEvaluation,
  ): Promise<ControlEvaluation> {
    const { data, error } = await supabase
      .from('control_evaluations')
      .insert(evaluation)
      .select()
      .single();

    if (error) throw new Error(`Failed to persist evaluation: ${error.message}`);
    return data as ControlEvaluation;
  }

  private static async updateControlStatus(
    supabase: ReturnType<typeof createAdminClient>,
    control: Control,
    result: EvaluationResult,
    now: string,
  ): Promise<void> {
    const statusMap: Record<EvaluationResult, Control['status']> = {
      pass: 'passing',
      fail: 'failing',
      warning: 'warning',
      error: 'not_evaluated',
    };

    const newStatus = statusMap[result];
    const consecutiveFailures = result === 'fail'
      ? control.consecutive_failures + 1
      : result === 'pass' ? 0 : control.consecutive_failures;

    const { error } = await supabase
      .from('controls')
      .update({
        status: newStatus,
        last_evaluated_at: now,
        consecutive_failures: consecutiveFailures,
        updated_at: now,
      })
      .eq('id', control.id)
      .eq('tenant_id', control.tenant_id);

    if (error) throw new Error(`Failed to update control status: ${error.message}`);
  }

}
