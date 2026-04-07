CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id), -- If null, framework is global across platform
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS framework_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  control_code TEXT NOT NULL, -- e.g. 'EU-AI-ACT-ART-13'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS control_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  control_id UUID REFERENCES framework_controls(id) ON DELETE CASCADE,
  audit_event_id UUID REFERENCES audit_events(id),
  evidence_text TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fw_select ON compliance_frameworks;
CREATE POLICY fw_select ON compliance_frameworks FOR SELECT USING (tenant_id IS NULL OR tenant_id = auth.uid());

DROP POLICY IF EXISTS fc_select ON framework_controls;
CREATE POLICY fc_select ON framework_controls FOR SELECT USING (true); -- Usually restricted by JOIN on frameworks

DROP POLICY IF EXISTS ce_select ON control_evidence;
CREATE POLICY ce_select ON control_evidence FOR SELECT USING (tenant_id = auth.uid());

-- Insert Seed Data (Mock Frameworks)
DO $$
DECLARE
  eu_fw_id UUID;
  nist_fw_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM compliance_frameworks WHERE name = 'EU AI Act' LIMIT 1) THEN
    INSERT INTO compliance_frameworks (name, description, version) VALUES 
      ('EU AI Act', 'Harmonised rules on artificial intelligence (Artificial Intelligence Act)', '2024');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM compliance_frameworks WHERE name = 'NIST AI RMF' LIMIT 1) THEN
    INSERT INTO compliance_frameworks (name, description, version) VALUES 
      ('NIST AI RMF', 'AI Risk Management Framework', '1.0');
  END IF;

  SELECT id INTO eu_fw_id FROM compliance_frameworks WHERE name = 'EU AI Act' LIMIT 1;
  SELECT id INTO nist_fw_id FROM compliance_frameworks WHERE name = 'NIST AI RMF' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = eu_fw_id AND control_code = 'ART-13') THEN
    INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
      (eu_fw_id, 'ART-13', 'Transparency and provision of information to users', 'High-risk AI systems shall be designed and developed in such a way to ensure that their operation is sufficiently transparent.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = eu_fw_id AND control_code = 'ART-14') THEN
    INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
      (eu_fw_id, 'ART-14', 'Human oversight', 'High-risk AI systems shall be designed and developed in such a way that they can be effectively overseen by natural persons.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = eu_fw_id AND control_code = 'ART-15') THEN
    INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
      (eu_fw_id, 'ART-15', 'Accuracy, robustness and cybersecurity', 'High-risk AI systems shall be resilient as regards errors, faults or inconsistencies that may occur within the system.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = nist_fw_id AND control_code = 'MAP-1') THEN
    INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
      (nist_fw_id, 'MAP-1', 'Context is established and understood', 'Intended purposes, potentially beneficial uses, and context-specific AI capabilities are understood.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = nist_fw_id AND control_code = 'MAP-2') THEN
    INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
      (nist_fw_id, 'MAP-2', 'Categorization of AI system', 'AI systems are categorized according to their intended context and potential impacts.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = nist_fw_id AND control_code = 'MEASURE-1') THEN
    INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
      (nist_fw_id, 'MEASURE-1', 'Identify and track risks', 'Appropriate methods and metrics are identified and applied to measure AI risks.');
  END IF;
END $$;
