/**
 * Types for Agent Behavior Timeline Service.
 *
 * EU AI Act Article 13 — Transparency & Traceability
 * ISO 42001 Clause 8.5 — Human Oversight Logs
 *
 * Phase 5 Task 5.1.1
 */

export type AgentTimelineSource = 'audit' | 'firewall' | 'hitl' | 'anomaly' | 'incident';

export interface AgentTimelineEvent {
  source: AgentTimelineSource;
  event: Record<string, unknown>;
  timestamp: string;
}

export interface AgentBehaviorSummary {
  total_actions: number;
  blocked_actions: number;
  hitl_escalations: number;
  anomalies: number;
  incidents: number;
}

export interface AgentTimelineResult {
  agent: Record<string, unknown>;
  events: AgentTimelineEvent[];
  summary: AgentBehaviorSummary;
}

export interface AgentEvidenceContribution {
  report_id: string;
  report_type: string;
  generated_at: string;
  regulation: string | null;
}
