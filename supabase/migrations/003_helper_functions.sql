-- Helper Functions for Make.com Integration
-- Run this in Supabase SQL Editor

-- =====================================================================
-- FUNCTION: upsert_source
-- =====================================================================
-- Used by Make.com to upsert sources discovered from search results
-- Returns the source record and whether it was newly created

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
  v_times_seen INTEGER;
BEGIN
  -- Insert new source or update existing
  INSERT INTO sources (domain, first_discovered_from_event_id, times_seen_in_search)
  VALUES (p_domain, p_event_id, 1)
  ON CONFLICT (domain)
  DO UPDATE SET
    times_seen_in_search = sources.times_seen_in_search + 1,
    updated_at = NOW()
  RETURNING sources.id, sources.times_seen_in_search INTO v_source_id, v_times_seen;

  -- Return the source with is_new flag
  SELECT
    s.id,
    s.domain,
    s.status,
    s.times_seen_in_search,
    (s.times_seen_in_search = 1) as is_new
  INTO
    id, domain, status, times_seen_in_search, is_new
  FROM sources s
  WHERE s.id = v_source_id;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_source(TEXT, UUID) TO authenticated, anon, service_role;

COMMENT ON FUNCTION upsert_source IS
  'Upserts a source domain, incrementing times_seen_in_search on conflict. Used by Make.com.';

-- =====================================================================
-- FUNCTION: get_source_by_domain
-- =====================================================================
-- Helper to find a source by domain (exact or base domain match)

CREATE OR REPLACE FUNCTION get_source_by_domain(p_domain TEXT)
RETURNS TABLE (
  id UUID,
  domain TEXT,
  display_name TEXT,
  status TEXT,
  newsletter_signup_url TEXT,
  candidate_type TEXT,
  times_seen_in_search INTEGER
) AS $$
BEGIN
  -- Try exact match first
  RETURN QUERY
  SELECT
    s.id,
    s.domain,
    s.display_name,
    s.status,
    s.newsletter_signup_url,
    s.candidate_type,
    s.times_seen_in_search
  FROM sources s
  WHERE s.domain = p_domain
  LIMIT 1;

  -- If no exact match, try base domain (for subdomains)
  IF NOT FOUND THEN
    DECLARE
      v_base_domain TEXT;
    BEGIN
      -- Extract base domain (last two parts: example.com from newsletter.example.com)
      v_base_domain := substring(p_domain from '([^.]+\.[^.]+)$');

      RETURN QUERY
      SELECT
        s.id,
        s.domain,
        s.display_name,
        s.status,
        s.newsletter_signup_url,
        s.candidate_type,
        s.times_seen_in_search
      FROM sources s
      WHERE s.domain = v_base_domain
      LIMIT 1;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_source_by_domain(TEXT) TO authenticated, anon, service_role;

COMMENT ON FUNCTION get_source_by_domain IS
  'Finds a source by exact domain or base domain match';

-- =====================================================================
-- FUNCTION: get_events_needing_source_discovery
-- =====================================================================
-- Returns events that have been liked but haven't had source discovery run yet
-- Useful for batch processing or recovering from Make.com failures

CREATE OR REPLACE FUNCTION get_events_needing_source_discovery()
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  venue_name TEXT,
  start_time TIMESTAMPTZ,
  reaction_count BIGINT,
  discovery_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as event_id,
    e.title,
    e.venue_name,
    e.start_time,
    COUNT(DISTINCT r.id) as reaction_count,
    COUNT(DISTINCT sd.id) as discovery_count
  FROM events e
  INNER JOIN user_event_reactions r ON r.event_id = e.id AND r.reaction = 'like'
  LEFT JOIN source_discoveries sd ON sd.event_id = e.id
  GROUP BY e.id, e.title, e.venue_name, e.start_time
  HAVING COUNT(DISTINCT sd.id) = 0  -- No discoveries yet
  ORDER BY e.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_events_needing_source_discovery() TO authenticated, service_role;

COMMENT ON FUNCTION get_events_needing_source_discovery IS
  'Returns liked events that have not had source discovery run yet';

-- =====================================================================
-- FUNCTION: mark_source_as_subscribed
-- =====================================================================
-- Helper to mark a source as subscribed and create/update subscription record

CREATE OR REPLACE FUNCTION mark_source_as_subscribed(
  p_source_id UUID,
  p_subscription_email TEXT
)
RETURNS TABLE (
  source_id UUID,
  subscription_id UUID,
  success BOOLEAN
) AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Update source status
  UPDATE sources
  SET status = 'subscribed', updated_at = NOW()
  WHERE id = p_source_id;

  -- Upsert newsletter subscription
  INSERT INTO newsletter_subscriptions (source_id, subscription_email, subscription_status, subscribed_at)
  VALUES (p_source_id, p_subscription_email, 'active', NOW())
  ON CONFLICT (source_id, subscription_email)
  DO UPDATE SET
    subscription_status = 'active',
    subscribed_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  source_id := p_source_id;
  subscription_id := v_subscription_id;
  success := true;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint for newsletter_subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'newsletter_subscriptions_source_email_unique'
  ) THEN
    ALTER TABLE newsletter_subscriptions
    ADD CONSTRAINT newsletter_subscriptions_source_email_unique
    UNIQUE (source_id, subscription_email);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION mark_source_as_subscribed(UUID, TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION mark_source_as_subscribed IS
  'Marks a source as subscribed and creates/updates subscription record';

-- =====================================================================
-- VIEW: suggested_sources
-- =====================================================================
-- View of sources that have been suggested for subscription

CREATE OR REPLACE VIEW suggested_sources AS
SELECT
  s.id,
  s.domain,
  s.display_name,
  s.newsletter_signup_url,
  s.candidate_type,
  s.times_seen_in_search,
  s.first_discovered_from_event_id,
  e.title as first_event_title,
  e.venue_name as first_event_venue,
  COUNT(DISTINCT sd.event_id) as events_discovered_count,
  s.created_at,
  s.updated_at
FROM sources s
LEFT JOIN events e ON e.id = s.first_discovered_from_event_id
LEFT JOIN source_discoveries sd ON sd.source_id = s.id
WHERE s.status = 'suggested'
GROUP BY s.id, s.domain, s.display_name, s.newsletter_signup_url,
         s.candidate_type, s.times_seen_in_search, s.first_discovered_from_event_id,
         e.title, e.venue_name, s.created_at, s.updated_at
ORDER BY s.times_seen_in_search DESC, s.created_at DESC;

COMMENT ON VIEW suggested_sources IS
  'Sources that have been suggested for newsletter subscription';

-- Grant select on view
GRANT SELECT ON suggested_sources TO authenticated, service_role;

-- =====================================================================
-- VIEW: recent_ingested_emails
-- =====================================================================
-- View of recently ingested emails with source info

CREATE OR REPLACE VIEW recent_ingested_emails AS
SELECT
  ie.id,
  ie.raw_email_id,
  ie.subject,
  ie.from_address,
  ie.received_at,
  ie.parsed_status,
  ie.parsed_events_count,
  s.domain as source_domain,
  s.display_name as source_name,
  s.status as source_status,
  ie.created_at
FROM ingested_emails ie
LEFT JOIN sources s ON s.id = ie.source_id
ORDER BY ie.received_at DESC, ie.created_at DESC
LIMIT 100;

COMMENT ON VIEW recent_ingested_emails IS
  'Recently ingested emails with source information';

GRANT SELECT ON recent_ingested_emails TO authenticated, service_role;
