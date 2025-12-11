-- Add hidden column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Create index for hidden events
CREATE INDEX IF NOT EXISTS idx_events_hidden ON events(hidden) WHERE hidden = FALSE;

-- Add dislike reaction type to user_event_reactions check constraint
ALTER TABLE user_event_reactions DROP CONSTRAINT IF EXISTS user_event_reactions_reaction_check;
ALTER TABLE user_event_reactions ADD CONSTRAINT user_event_reactions_reaction_check
  CHECK (reaction IN ('like', 'dislike'));

-- Create view for sources to unsubscribe (sources with 5+ dislikes)
CREATE OR REPLACE VIEW sources_to_unsubscribe AS
SELECT
  s.id,
  s.domain,
  s.display_name,
  s.status,
  s.newsletter_signup_url,
  COUNT(DISTINCT uer.event_id) as dislike_count
FROM sources s
INNER JOIN events e ON e.source_id = s.id
INNER JOIN user_event_reactions uer ON uer.event_id = e.id AND uer.reaction = 'dislike'
WHERE s.status = 'subscribed'
GROUP BY s.id, s.domain, s.display_name, s.status, s.newsletter_signup_url
HAVING COUNT(DISTINCT uer.event_id) >= 5;

-- Grant permissions on view
GRANT SELECT ON sources_to_unsubscribe TO authenticated, anon, service_role;

-- Function to count dislikes for a source
CREATE OR REPLACE FUNCTION get_source_dislike_count(p_source_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT uer.event_id)::INTEGER
  FROM user_event_reactions uer
  INNER JOIN events e ON e.id = uer.event_id
  WHERE e.source_id = p_source_id
    AND uer.reaction = 'dislike';
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION get_source_dislike_count TO authenticated, anon, service_role;

COMMENT ON COLUMN events.hidden IS 'Events marked as hidden (disliked) will not show in the UI';
COMMENT ON VIEW sources_to_unsubscribe IS 'Sources with 5 or more dislikes, suggesting they should be unsubscribed';
