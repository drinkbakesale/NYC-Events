-- Fix for upsert_source function
-- Run this in Supabase SQL Editor to replace the broken function

CREATE OR REPLACE FUNCTION upsert_source(
  p_domain TEXT,
  p_event_id UUID
)
RETURNS TABLE (
  id UUID,
  domain TEXT,
  status TEXT,
  times_seen_in_search INTEGER,
  is_new BOOLEAN
) AS $$
DECLARE
  v_source_id UUID;
  v_domain TEXT;
  v_status TEXT;
  v_times_seen INTEGER;
  v_is_new BOOLEAN;
BEGIN
  -- Insert or update the source
  INSERT INTO sources (domain, first_discovered_from_event_id, times_seen_in_search)
  VALUES (p_domain, p_event_id, 1)
  ON CONFLICT (domain)
  DO UPDATE SET
    times_seen_in_search = sources.times_seen_in_search + 1,
    updated_at = NOW()
  RETURNING sources.id INTO v_source_id;

  -- Get the source details
  SELECT
    s.id,
    s.domain,
    s.status,
    s.times_seen_in_search,
    (s.times_seen_in_search = 1) as is_new
  INTO
    v_source_id,
    v_domain,
    v_status,
    v_times_seen,
    v_is_new
  FROM sources s
  WHERE s.id = v_source_id;

  -- Return the values
  id := v_source_id;
  domain := v_domain;
  status := v_status;
  times_seen_in_search := v_times_seen;
  is_new := v_is_new;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_source(TEXT, UUID) TO authenticated, anon, service_role;
