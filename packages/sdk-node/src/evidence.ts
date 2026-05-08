/**
 * RuneSignal Node SDK — Evidence Bundles Resource
 * POST /api/v1/compliance/evidence-export
 * GET  /api/v1/compliance/evidence-bundles
 */

import { BaseClient } from './client';

export type Regulation = 'eu_ai_act' | 'iso_42001' | 'nist_ai_rmf' | 'hipaa' | 'sox' | 'gdpr' | 'pci_dss';
export type EvidenceFormat = 'json' | 'pdf' | 'zip';

export interface EvidencePreviewRequest {
  regulation: Regulation;
  dateFrom: string;   // ISO date YYYY-MM-DD
  dateTo: string;
  agentIds?: string[];
}

export interface EvidenceGap {
  article: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  remediationHint: string;
}

export interface ArticleCoverage {
  article: string;
  title: string;
  covered: boolean;
  coveragePct: number;
  evidenceCount: number;
}

export interface EvidencePreview {
  regulation: Regulation;
  overallScore: number;
  articleCoverage: ArticleCoverage[];
  gaps: EvidenceGap[];
  periodFrom: string;
  periodTo: string;
  agentCount: number;
  totalEvents: number;
}

export interface GenerateEvidenceRequest {
  regulation: Regulation;
  dateFrom: string;
  dateTo: string;
  agentIds?: string[];
  includeAttachments?: boolean;
  signatoryEmail?: string;
}

export interface EvidenceBundle {
  id: string;
  tenantId: string;
  regulation: Regulation;
  status: 'generating' | 'ready' | 'failed';
  overallScore: number;
  articleCount: number;
  evidenceItemCount: number;
  signatureHash?: string;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

export class EvidenceResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Dry-run preview — shows coverage score and gaps without persisting a bundle.
   *
   * @example
   * const preview = await client.evidence.preview({
   *   regulation: 'eu_ai_act',
   *   dateFrom: '2026-01-01',
   *   dateTo: '2026-03-31',
   * });
   * console.log(`Coverage: ${preview.overallScore}% · Gaps: ${preview.gaps.length}`);
   */
  async preview(request: EvidencePreviewRequest): Promise<EvidencePreview> {
    const query: Record<string, string> = {
      regulation: request.regulation,
      date_from: request.dateFrom,
      date_to: request.dateTo,
    };
    if (request.agentIds?.length) {
      query.agent_ids = request.agentIds.join(',');
    }

    const raw: any = await (this.client as any).request(
      'GET',
      '/api/v1/compliance/evidence-preview',
      { query }
    );

    return {
      regulation: raw.regulation,
      overallScore: raw.overall_score,
      articleCoverage: (raw.article_coverage || []).map((a: any) => ({
        article: a.article,
        title: a.title,
        covered: a.covered,
        coveragePct: a.coverage_pct,
        evidenceCount: a.evidence_count,
      })),
      gaps: (raw.gaps || []).map((g: any) => ({
        article: g.article,
        description: g.description,
        severity: g.severity,
        remediationHint: g.remediation_hint,
      })),
      periodFrom: raw.period_from,
      periodTo: raw.period_to,
      agentCount: raw.agent_count,
      totalEvents: raw.total_events,
    };
  }

  /**
   * Generate and persist a signed evidence bundle.
   * The bundle is cryptographically signed (Ed25519) and stored for 10 years.
   *
   * @example
   * const bundle = await client.evidence.generate({
   *   regulation: 'eu_ai_act',
   *   dateFrom: '2026-01-01',
   *   dateTo: '2026-03-31',
   * });
   */
  async generate(request: GenerateEvidenceRequest): Promise<EvidenceBundle> {
    const raw: any = await (this.client as any).request(
      'POST',
      '/api/v1/compliance/evidence-export',
      {
        body: {
          regulation: request.regulation,
          date_from: request.dateFrom,
          date_to: request.dateTo,
          agent_ids: request.agentIds,
          include_attachments: request.includeAttachments,
          signatory_email: request.signatoryEmail,
        },
      }
    );

    return mapBundle(raw);
  }

  /** Download a bundle in the specified format. Returns the raw body. */
  async download(bundleId: string, format: EvidenceFormat = 'json'): Promise<unknown> {
    return (this.client as any).request('GET', `/api/v1/compliance/evidence-bundles/${bundleId}`, {
      query: { format },
    });
  }

  /** List all previously generated evidence bundles. */
  async list(options: { regulation?: Regulation; limit?: number } = {}): Promise<EvidenceBundle[]> {
    const query: Record<string, string> = {};
    if (options.regulation) query.regulation = options.regulation;
    if (options.limit)      query.limit      = String(options.limit);

    const raw: any[] = await (this.client as any).request(
      'GET', '/api/v1/compliance/evidence-bundles', { query }
    );
    return raw.map(mapBundle);
  }
}

function mapBundle(raw: any): EvidenceBundle {
  return {
    id:                raw.id,
    tenantId:          raw.tenant_id,
    regulation:        raw.regulation,
    status:            raw.status,
    overallScore:      raw.overall_score,
    articleCount:      raw.article_count,
    evidenceItemCount: raw.evidence_item_count,
    signatureHash:     raw.signature_hash,
    downloadUrl:       raw.download_url,
    expiresAt:         raw.expires_at,
    createdAt:         raw.created_at,
  };
}
