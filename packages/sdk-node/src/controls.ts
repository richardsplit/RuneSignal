/**
 * RuneSignal Node SDK — Compliance Controls Resource
 * GET/POST /api/v1/controls
 */

import { BaseClient } from './client';

export type ControlStatus = 'passing' | 'failing' | 'not_evaluated' | 'not_applicable';
export type ControlFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly';

export interface Control {
  id: string;
  name: string;
  description: string;
  framework: string;
  frameworkClause: string;
  status: ControlStatus;
  lastEvaluatedAt?: string;
  nextEvaluationAt?: string;
  failureReason?: string;
  evidenceCount: number;
  frequency: ControlFrequency;
}

export interface ControlsSummary {
  total: number;
  passing: number;
  failing: number;
  notEvaluated: number;
  notApplicable: number;
  overallHealthPct: number;
}

export interface SeedResult {
  seeded: number;
  skipped: number;
  framework: string;
}

export class ControlsResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Seed default compliance controls for the tenant.
   * Safe to call multiple times — skips controls that already exist.
   *
   * @example
   * const { seeded, skipped } = await client.controls.seed();
   */
  async seed(framework = 'eu_ai_act'): Promise<SeedResult> {
    const raw: any = await (this.client as any).request('POST', '/api/v1/controls/seed', {
      body: { framework },
    });
    return {
      seeded:    raw.seeded,
      skipped:   raw.skipped,
      framework: raw.framework,
    };
  }

  /** List all controls, optionally filtered by framework or status. */
  async list(options: { framework?: string; status?: ControlStatus; limit?: number } = {}): Promise<Control[]> {
    const query: Record<string, string> = {};
    if (options.framework) query.framework = options.framework;
    if (options.status)    query.status    = options.status;
    if (options.limit)     query.limit     = String(options.limit);

    const raw: any[] = await (this.client as any).request('GET', '/api/v1/controls', { query });
    return raw.map(mapControl);
  }

  /** Trigger an immediate re-evaluation of a single control. */
  async evaluate(controlId: string): Promise<Control> {
    const raw: any = await (this.client as any).request('POST', `/api/v1/controls/${controlId}/evaluate`);
    return mapControl(raw);
  }

  /**
   * Get control health summary — useful for dashboard KPI widgets.
   *
   * @example
   * const s = await client.controls.status();
   * console.log(`${s.passing}/${s.total} controls passing (${s.overallHealthPct}%)`);
   */
  async status(): Promise<ControlsSummary> {
    const raw: any = await (this.client as any).request('GET', '/api/v1/controls/status');
    return {
      total:            raw.total,
      passing:          raw.passing,
      failing:          raw.failing,
      notEvaluated:     raw.not_evaluated,
      notApplicable:    raw.not_applicable,
      overallHealthPct: raw.overall_health_pct,
    };
  }
}

function mapControl(raw: any): Control {
  return {
    id:                raw.id,
    name:              raw.name,
    description:       raw.description,
    framework:         raw.framework,
    frameworkClause:   raw.framework_clause,
    status:            raw.status,
    lastEvaluatedAt:   raw.last_evaluated_at,
    nextEvaluationAt:  raw.next_evaluation_at,
    failureReason:     raw.failure_reason,
    evidenceCount:     raw.evidence_count,
    frequency:         raw.frequency,
  };
}
