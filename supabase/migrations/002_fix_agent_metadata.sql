-- Fix for Phase 8.1 Part 1 missing metadata column
ALTER TABLE agent_credentials ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Final verification check for S1 Arbiter tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE EXTENSION vector;
    END IF;
END $$;
