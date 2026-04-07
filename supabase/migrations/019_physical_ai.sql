-- S15 Physical AI (Robotics & IoT) Engine Schema

CREATE TABLE IF NOT EXISTS hardware_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nhi_agent_id UUID, -- Optional tie-in to the S12 Cryptographic Identity
    name TEXT NOT NULL,
    device_type TEXT NOT NULL, -- e.g., 'drone', 'arm', 'vehicle'
    status TEXT DEFAULT 'online', -- 'online', 'offline', 'estop_engaged'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kinetic_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES hardware_nodes(id) ON DELETE CASCADE UNIQUE,
    max_velocity_ms NUMERIC DEFAULT 0.0,
    geofence_center_lat NUMERIC,
    geofence_center_lon NUMERIC,
    geofence_radius_m NUMERIC,
    is_estop_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hardware_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinetic_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hw_nodes_tenant ON hardware_nodes;
DROP POLICY IF EXISTS kin_pol_tenant ON kinetic_policies;

CREATE POLICY hw_nodes_tenant ON hardware_nodes FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY kin_pol_tenant ON kinetic_policies FOR ALL USING (
    node_id IN (SELECT id FROM hardware_nodes WHERE tenant_id = auth.uid())
);
