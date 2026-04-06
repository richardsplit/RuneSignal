-- supabase/migrations/013_usage_tracking.sql
-- Tracking API consumption for commercial billing

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS api_requests_total BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_requests_monthly BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Function to atomically increment usage and handle monthly resets if needed
-- This can be called via .rpc() in middleware
CREATE OR REPLACE FUNCTION increment_api_usage(t_id UUID)
RETURNS VOID AS $$
BEGIN
    -- If more than 30 days since last reset, reset the monthly counter
    -- (In a real app, this would follow the Stripe billing cycle, but for MVP we use 30 days)
    IF (SELECT last_reset_at FROM tenants WHERE id = t_id) < NOW() - INTERVAL '30 days' THEN
        UPDATE tenants 
        SET api_requests_monthly = 1,
            api_requests_total = api_requests_total + 1,
            last_reset_at = NOW()
        WHERE id = t_id;
    ELSE
        UPDATE tenants 
        SET api_requests_monthly = api_requests_monthly + 1,
            api_requests_total = api_requests_total + 1
        WHERE id = t_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
