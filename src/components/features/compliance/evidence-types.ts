export type Regulation = 'eu_ai_act' | 'iso_42001';

export interface RegulationClause {
  clause_ref: string;
  clause_title: string;
  description: string;
  evidence_sources: string[];
  required_for_coverage: boolean;
}

export interface RegulationInfo {
  regulation: string;
  clauses: RegulationClause[];
}

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

export interface ExportResult {
  export_id: string;
  regulation: Regulation;
  status: string;
  evidence_manifest: any;
  coverage?: BundleCoverage;
}

export interface AgentOption {
  id: string;
  agent_name: string;
  agent_type: string;
  status: string;
}

export const REGULATIONS: Array<{ id: Regulation; name: string; description: string; clauses: number }> = [
  {
    id: 'eu_ai_act',
    name: 'EU AI Act',
    description: 'European Union Artificial Intelligence Act (Regulation 2024/1689). Covers transparency, human oversight, quality management, and deployer obligations.',
    clauses: 4,
  },
  {
    id: 'iso_42001',
    name: 'ISO 42001',
    description: 'AI Management System standard (ISO/IEC 42001:2023). Covers risk management, technical documentation, oversight logs, accuracy, and incident reporting.',
    clauses: 5,
  },
];

export const PRESETS = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
];

export const MOCK_CLAUSES: Record<Regulation, RegulationClause[]> = {
  eu_ai_act: [
    { clause_ref: 'Art.13', clause_title: 'Transparency', description: 'AI systems must be sufficiently transparent to enable deployers to interpret output and use it appropriately.', evidence_sources: ['audit_events', 'agent_manifests'], required_for_coverage: true },
    { clause_ref: 'Art.14', clause_title: 'Human Oversight', description: 'High-risk AI systems must allow effective oversight by natural persons.', evidence_sources: ['hitl_approvals', 'audit_events'], required_for_coverage: true },
    { clause_ref: 'Art.17', clause_title: 'Quality Management', description: 'Providers of high-risk AI systems must implement a quality management system.', evidence_sources: ['provenance_certs', 'anomaly_alerts'], required_for_coverage: true },
    { clause_ref: 'Art.29', clause_title: 'Deployer Obligations', description: 'Deployers must take appropriate technical and organisational measures.', evidence_sources: ['agent_manifests', 'policies'], required_for_coverage: false },
  ],
  iso_42001: [
    { clause_ref: '6.1', clause_title: 'Risk Management', description: 'The organisation must assess AI-related risks and opportunities.', evidence_sources: ['anomaly_alerts', 'audit_events'], required_for_coverage: true },
    { clause_ref: '7.5', clause_title: 'Technical Documentation', description: 'Documented information required by the standard must be maintained.', evidence_sources: ['agent_manifests', 'provenance_certs'], required_for_coverage: true },
    { clause_ref: '8.4', clause_title: 'Oversight Logs', description: 'Records of AI system operation and decisions must be maintained.', evidence_sources: ['audit_events', 'hitl_approvals'], required_for_coverage: true },
    { clause_ref: '9.1', clause_title: 'Performance Monitoring', description: 'The organisation must monitor, measure, and evaluate the AI management system.', evidence_sources: ['provenance_certs', 'anomaly_alerts'], required_for_coverage: true },
    { clause_ref: '10.2', clause_title: 'Incident Reporting', description: 'Incidents related to AI systems must be identified and managed.', evidence_sources: ['audit_events'], required_for_coverage: false },
  ],
};
