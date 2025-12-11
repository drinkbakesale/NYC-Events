-- Upsert function that inserts new events or returns existing ones
-- This prevents Make.com from failing on duplicates

CREATE OR REPLACE FUNCTION upsert_event_safe(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_time TEXT DEFAULT NULL,
  p_end_time TEXT DEFAULT NULL,
  p_venue_name TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_city TEXT DEFAULT 'New York',
  p_source_event_url TEXT DEFAULT NULL,
  p_created_via TEXT DEFAULT 'import',
  p_source_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  venue_name TEXT,
  neighborhood TEXT,
  city TEXT,
  source_event_url TEXT,
  created_via TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  was_created BOOLEAN
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_event RECORD;
BEGIN
  -- Convert empty strings to NULL for timestamps
  IF p_start_time = '' OR p_start_time IS NULL THEN
    v_start_time := NULL;
  ELSE
    v_start_time := p_start_time::TIMESTAMPTZ;
  END IF;

  IF p_end_time = '' OR p_end_time IS NULL THEN
    v_end_time := NULL;
  ELSE
    v_end_time := p_end_time::TIMESTAMPTZ;
  END IF;

  -- Convert empty source_event_url to NULL
  IF p_source_event_url = '' THEN
    p_source_event_url := NULL;
  END IF;

  -- Try to insert the event
  BEGIN
    INSERT INTO events (
      title, description, start_time, end_time, venue_name,
      neighborhood, city, source_event_url, created_via, source_id
    )
    VALUES (
      p_title,
      p_description,
      v_start_time,
      v_end_time,
      p_venue_name,
      p_neighborhood,
      p_city,
      p_source_event_url,
      p_created_via,
      p_source_id
    )
    RETURNING events.* INTO v_event;

    -- Event was created successfully
    RETURN QUERY SELECT
      v_event.id,
      v_event.title,
      v_event.description,
      v_event.start_time,
      v_event.end_time,
      v_event.venue_name,
      v_event.neighborhood,
      v_event.city,
      v_event.source_event_url,
      v_event.created_via,
      v_event.source_id,
      v_event.created_at,
      v_event.updated_at,
      TRUE as was_created;

  EXCEPTION WHEN unique_violation THEN
    -- Event already exists, fetch and return it
    -- Try to find by title + venue + time first
    IF v_start_time IS NOT NULL THEN
      SELECT events.* INTO v_event
      FROM events
      WHERE
        LOWER(TRIM(events.title)) = LOWER(TRIM(p_title))
        AND LOWER(TRIM(COALESCE(events.venue_name, ''))) = LOWER(TRIM(COALESCE(p_venue_name, '')))
        AND events.start_time = v_start_time
      LIMIT 1;
    END IF;

    -- If not found and source_event_url is provided, try to find by URL
    IF v_event.id IS NULL AND p_source_event_url IS NOT NULL THEN
      SELECT events.* INTO v_event
      FROM events
      WHERE events.source_event_url = p_source_event_url
      LIMIT 1;
    END IF;

    -- Return the existing event
    RETURN QUERY SELECT
      v_event.id,
      v_event.title,
      v_event.description,
      v_event.start_time,
      v_event.end_time,
      v_event.venue_name,
      v_event.neighborhood,
      v_event.city,
      v_event.source_event_url,
      v_event.created_via,
      v_event.source_id,
      v_event.created_at,
      v_event.updated_at,
      FALSE as was_created;
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_event_safe TO authenticated, anon, service_role;

COMMENT ON FUNCTION upsert_event_safe IS
  'Safely insert or return existing events. Returns was_created=true for new events, was_created=false for existing ones.';
