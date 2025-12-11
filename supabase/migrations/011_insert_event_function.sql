-- Create a function that properly handles empty strings for timestamp fields
-- This allows Make.com to send empty strings which will be converted to NULL

CREATE OR REPLACE FUNCTION insert_event_safe(
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
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Convert empty strings to NULL for timestamps
  IF p_start_time = '' THEN
    p_start_time := NULL;
  END IF;

  IF p_end_time = '' THEN
    p_end_time := NULL;
  END IF;

  IF p_source_event_url = '' THEN
    p_source_event_url := NULL;
  END IF;

  -- Insert the event
  RETURN QUERY
  INSERT INTO events (
    title, description, start_time, end_time, venue_name,
    neighborhood, city, source_event_url, created_via, source_id
  )
  VALUES (
    p_title,
    p_description,
    CASE WHEN p_start_time IS NULL THEN NULL ELSE p_start_time::TIMESTAMPTZ END,
    CASE WHEN p_end_time IS NULL THEN NULL ELSE p_end_time::TIMESTAMPTZ END,
    p_venue_name,
    p_neighborhood,
    p_city,
    p_source_event_url,
    p_created_via,
    p_source_id
  )
  RETURNING events.*;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION insert_event_safe TO authenticated, anon, service_role;

COMMENT ON FUNCTION insert_event_safe IS
  'Safely insert events, converting empty strings to NULL for timestamp fields';
