-- supabase/migrations/004_vector_helpers.sql

-- Helper for matching policies semantically
CREATE OR REPLACE FUNCTION match_policies (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_tenant_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    arbiter_policies.id,
    arbiter_policies.name,
    arbiter_policies.description,
    1 - (arbiter_policies.embedding <=> query_embedding) AS similarity
  FROM arbiter_policies
  WHERE arbiter_policies.tenant_id = p_tenant_id
    AND 1 - (arbiter_policies.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Helper for matching active intents semantically
CREATE OR REPLACE FUNCTION match_active_intents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_tenant_id uuid,
  p_exclude_agent_id uuid
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  intent_description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    agent_intents.id,
    agent_intents.agent_id,
    agent_intents.intent_description,
    1 - (agent_intents.embedding <=> query_embedding) AS similarity
  FROM agent_intents
  WHERE agent_intents.tenant_id = p_tenant_id
    AND agent_intents.agent_id != p_exclude_agent_id
    AND agent_intents.expires_at > NOW()
    AND 1 - (agent_intents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
