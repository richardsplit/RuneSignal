-- S16 A2A Gateway Schema

CREATE TABLE IF NOT EXISTS a2a_handshakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    initiator_id TEXT NOT NULL, 
    responder_id TEXT NOT NULL,
    terms_hash TEXT NOT NULL,
    terms_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS a2a_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handshake_id UUID REFERENCES a2a_handshakes(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    signature_payload TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(handshake_id, agent_id)
);

ALTER TABLE a2a_handshakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS a2a_handshakes_tenant ON a2a_handshakes;
DROP POLICY IF EXISTS a2a_signatures_tenant ON a2a_signatures;

CREATE POLICY a2a_handshakes_tenant ON a2a_handshakes FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY a2a_signatures_tenant ON a2a_signatures FOR ALL USING (
    handshake_id IN (SELECT id FROM a2a_handshakes WHERE tenant_id = auth.uid())
);
