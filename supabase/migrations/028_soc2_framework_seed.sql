-- AICPA TSC SOC 2 Framework Seed
DO $$ 
DECLARE 
  fw_id UUID;
BEGIN
  -- Insert framework if not exists
  IF NOT EXISTS (SELECT 1 FROM compliance_frameworks WHERE name = 'SOC 2 Type II' LIMIT 1) THEN
    INSERT INTO compliance_frameworks (name, description, version)
    VALUES ('SOC 2 Type II', 'Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy.', '2024');
  END IF;

  SELECT id INTO fw_id FROM compliance_frameworks WHERE name = 'SOC 2 Type II' LIMIT 1;
  
  IF fw_id IS NOT NULL THEN
    -- Insert controls if not exists (using control_code for uniqueness check)
    IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = fw_id AND control_code = 'CC1.1') THEN
      INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
        (fw_id, 'CC1.1', 'Integrity and Ethical Values', 'The entity demonstrates a commitment to integrity and ethical values.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = fw_id AND control_code = 'CC5.1') THEN
      INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
        (fw_id, 'CC5.1', 'Control Activities', 'The entity selects and develops control activities that contribute to the mitigation of risks.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = fw_id AND control_code = 'CC6.1') THEN
      INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
        (fw_id, 'CC6.1', 'Logical Access Security', 'The entity restricts logical access to information assets, software, and physical facilities.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = fw_id AND control_code = 'CC7.1') THEN
      INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
        (fw_id, 'CC7.1', 'System Operations', 'The entity evaluates and responds to security incidents and vulnerabilities.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = fw_id AND control_code = 'GOVERN-1') THEN
      INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
        (fw_id, 'GOVERN-1', 'TrustLayer Governance', 'Demonstrates automated enforcement of Corporate SOUL (S8) across agent lifecycles.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM framework_controls WHERE framework_id = fw_id AND control_code = 'MEASURE-1') THEN
      INSERT INTO framework_controls (framework_id, control_code, title, description) VALUES
        (fw_id, 'MEASURE-1', 'Continuous Monitoring', 'Demonstrates automated anomaly detection and HITL oversight through S14 and S7.');
    END IF;
  END IF;
END $$;
