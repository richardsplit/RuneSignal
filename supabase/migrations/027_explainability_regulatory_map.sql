-- Regulatory Mapping for Explainability context
CREATE TABLE IF NOT EXISTS explainability_regulatory_map (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code          TEXT NOT NULL UNIQUE,  -- 's1', 's8', 's15' etc.
  framework            TEXT NOT NULL,        -- 'EU AI Act', 'NIST AI RMF'
  requirement_code     TEXT NOT NULL,        -- 'ART-13', 'MEASURE-2.1'
  explanation_template TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed mappings
INSERT INTO explainability_regulatory_map (module_code, framework, requirement_code, explanation_template) VALUES
  ('s1',  'EU AI Act', 'ART-14', 'Human-in-the-loop fallback triggered due to high-risk intent conflict.'),
  ('s8',  'EU AI Act', 'ART-13', 'Decision aligned with Corporate SOUL transparency requirements.'),
  ('s15', 'EU AI Act', 'ART-15', 'Kinetic movement hard-blocked by S15 Physical Safety module to prevent out-of-bounds execution.'),
  ('s14', 'EU AI Act', 'ART-10', 'Model execution suspended due to statistical anomaly detection.'),
  ('core', 'NIST AI RMF', 'MEASURE-1.1', 'Core TrustLayer governance logic applied to verify provenance and identity.')
ON CONFLICT (module_code) DO NOTHING;

ALTER TABLE explainability_regulatory_map ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'erm_public_read') THEN
        CREATE POLICY erm_public_read ON explainability_regulatory_map FOR SELECT USING (true);
    END IF;
END $$;
