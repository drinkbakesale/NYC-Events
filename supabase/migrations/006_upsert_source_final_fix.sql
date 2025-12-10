-- Final fix for upsert_source - using different output column names to avoid any ambiguity

-- First, drop the old function completely
DROP FUNCTION IF EXISTS upsert_source(TEXT, UUID);

-- Create new function with completely unambiguous implementation
CREATE FUNCTION upsert_source(
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
  result_id UUID;
  result_domain TEXT;
  result_status TEXT;
  result_times_seen INTEGER;
  result_is_new BOOLEAN;
BEGIN
  -- Insert or update the source
  INSERT INTO sources (domain, first_discovered_from_event_id, times_seen_in_search)
  VALUES (p_domain, p_event_id, 1)
  ON CONFLICT (domain)
  DO UPDATE SET
    times_seen_in_search = sources.times_seen_in_search + 1,
    updated_at = NOW()
  RETURNING
    sources.id,
    sources.domain,
    sources.status,
    sources.times_seen_in_search,
    (sources.times_seen_in_search = 1)::BOOLEAN
  INTO
    result_id,
    result_domain,
    result_status,
    result_times_seen,
    result_is_new;

  -- Return the results
  id := result_id;
  domain := result_domain;
  status := result_status;
  times_seen_in_search := result_times_seen;
  is_new := result_is_new;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_source(TEXT, UUID) TO authenticated, anon, service_role;

-- Test the function
SELECT * FROM upsert_source('test-fix-domain.com', 'eb4aa659-1f04-4611-a385-179a6e4cfd62'::uuid);
