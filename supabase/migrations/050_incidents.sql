-- Migration 050: Incidents + Incident Timeline
-- Phase 3 Task 3.1.1
-- EU AI Act Article 73 — Serious Incident Reporting
-- ISO 42001 Clause 10.2 — Incident Documentation

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Classification
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL DEFAULT 'operational'
    CHECK (category IN ('operational', 'safety', 'rights_violation', 'security', 'compliance_gap')),

  -- EU AI Act Article 73 fields
  is_serious_incident BOOLEAN DEFAULT false,
  art73_report_deadline TIMESTAMPTZ,
  art73_report_id UUID REFERENCES compliance_reports(id),
  market_surveillance_authority TEXT,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected', 'investigating', 'mitigated', 'reported', 'closed')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investigating_since TIMESTAMPTZ,
  mitigated_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- People
  reported_by TEXT,
  incident_commander UUID,

  -- Correlation
  related_anomaly_ids UUID[] DEFAULT '{}',
  related_hitl_ids UUID[] DEFAULT '{}',
  related_agent_ids UUID[] DEFAULT '{}',
  related_firewall_ids UUID[] DEFAULT '{}',

  -- Resolution
  root_cause TEXT,
  corrective_actions JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_tenant_status ON incidents(tenant_id, status);
CREATE INDEX idx_incidents_art73_deadline ON incidents(art73_report_deadline)
  WHERE is_serious_incident = true AND status != 'closed';

-- Timeline entries for incident lifecycle events
CREATE TABLE incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  audit_event_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_timeline ON incident_timeline(incident_id, created_at);
