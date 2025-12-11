-- Prevent duplicate events from being inserted
-- This creates a unique constraint on combinations that should identify the same event

-- Option 1: Unique constraint on title + venue + start_time
-- This prevents exact duplicates (same event at same venue at same time)
CREATE UNIQUE INDEX idx_events_unique_title_venue_time
ON events (
  LOWER(TRIM(title)),
  LOWER(TRIM(COALESCE(venue_name, ''))),
  start_time
)
WHERE start_time IS NOT NULL;

-- Option 2: Unique constraint on source_event_url
-- This prevents inserting the same event URL multiple times
CREATE UNIQUE INDEX idx_events_unique_source_url
ON events (source_event_url)
WHERE source_event_url IS NOT NULL AND source_event_url != '';

COMMENT ON INDEX idx_events_unique_title_venue_time IS
  'Prevent duplicate events: same title + venue + time = duplicate';

COMMENT ON INDEX idx_events_unique_source_url IS
  'Prevent duplicate events: same source URL = duplicate';
