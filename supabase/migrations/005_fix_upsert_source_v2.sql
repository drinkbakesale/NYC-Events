-- Complete fix for upsert_source function
-- This version avoids all ambiguity by using RETURN QUERY instead of RETURN NEXT

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
BEGIN
  -- Insert or update the source
  INSERT INTO sources (domain, first_discovered_from_event_id, times_seen_in_search)
  VALUES (p_domain, p_event_id, 1)
  ON CONFLICT (domain)
  DO UPDATE SET
    times_seen_in_search = sources.times_seen_in_search + 1,
    updated_at = NOW()
  RETURNING sources.id INTO v_source_id;

  -- Return the source details using RETURN QUERY
  RETURN QUERY
  SELECT
    s.id,
    s.domain,
    s.status,
    s.times_seen_in_search,
    (s.times_seen_in_search = 1)::BOOLEAN as is_new
  FROM sources s
  WHERE s.id = v_source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_source(TEXT, UUID) TO authenticated, anon, service_role;
