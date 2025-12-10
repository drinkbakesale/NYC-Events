-- Working upsert_source using a different approach
-- Avoids ON CONFLICT ambiguity by checking if record exists first

DROP FUNCTION IF EXISTS upsert_source(TEXT, UUID);

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
  v_source_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Check if domain already exists
  SELECT sources.id INTO v_source_id
  FROM sources
  WHERE sources.domain = p_domain;

  v_exists := FOUND;

  IF v_exists THEN
    -- Update existing source
    UPDATE sources
    SET
      times_seen_in_search = sources.times_seen_in_search + 1,
      updated_at = NOW()
    WHERE sources.id = v_source_id;
  ELSE
    -- Insert new source
    INSERT INTO sources (domain, first_discovered_from_event_id, times_seen_in_search)
    VALUES (p_domain, p_event_id, 1)
    RETURNING sources.id INTO v_source_id;
  END IF;

  -- Return the source details
  RETURN QUERY
  SELECT
    s.id,
    s.domain,
    s.status,
    s.times_seen_in_search,
    (NOT v_exists)::BOOLEAN as is_new
  FROM sources s
  WHERE s.id = v_source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_source(TEXT, UUID) TO authenticated, anon, service_role;

-- Test it
SELECT * FROM upsert_source('finally-working-domain.com', 'eb4aa659-1f04-4611-a385-179a6e4cfd62'::uuid);
