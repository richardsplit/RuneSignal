-- S12 NHI Lifecycle Manager

-- Enhance api_keys table to support ephemeral lifespans and cryptographic revocation
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rotation_frequency_days INTEGER DEFAULT 30;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS death_certificate_id TEXT;

-- Lineage table for rotations
CREATE TABLE IF NOT EXISTS nhi_key_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    agent_id UUID,
    old_key_id UUID,  -- Not hard enforcing foreign key in case the dead key gets pruned
    new_key_id UUID,
    rotated_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT NOT NULL
);

ALTER TABLE nhi_key_rotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nhi_rotations_tenant ON nhi_key_rotations;
CREATE POLICY nhi_rotations_tenant ON nhi_key_rotations FOR SELECT USING (tenant_id = auth.uid());
