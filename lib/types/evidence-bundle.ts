import type { EuAiActReport } from '@lib/modules/compliance/eu-ai-act-report';
import type { Iso42001Report } from '@lib/modules/compliance/iso-42001-report';

export type Regulation = 'eu_ai_act' | 'iso_42001';

export type BundleStatus = 'generating' | 'ready' | 'failed';

export interface CoverageGap {
  clause_ref: string;
  status: 'not_covered' | 'partial';
  remediation_hint: string;
}

export interface BundleCoverage {
  overall_score: number;
  clauses_covered: number;
  clauses_total: number;
  gaps: CoverageGap[];
}

export interface BundleAttestation {
  bundle_hash: string;
  signature: string;
  key_id: string;
  signed_at: string;
}

export interface ControlStatusSnapshot {
  total_controls: number;
  passing: number;
  failing: number;
  warning: number;
  by_clause: Array<{
    clause_ref: string;
    controls: Array<{ name: string; status: string; last_evaluated: string | null }>;
  }>;
}

export interface EvidenceBundle {
  id: string;
  tenant_id: string;
  version: number;
  regulation: Regulation;
  period: { start: string; end: string };

  manifest: EuAiActReport | Iso42001Report;

  coverage: BundleCoverage;

  control_status?: ControlStatusSnapshot;

  attestation: BundleAttestation;

  generated_at: string;
  generated_by: string;
  export_formats_available: ('json' | 'pdf')[];

  status: BundleStatus;
}
