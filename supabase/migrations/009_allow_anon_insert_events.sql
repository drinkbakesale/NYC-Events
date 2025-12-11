-- Allow anonymous (anon) users to insert events
-- This is needed for Make.com integrations and other automation tools
-- that may use the anon key instead of service_role key

-- Policy: Allow anon users to insert events
CREATE POLICY "events_insert_anon"
ON events FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow anon users to select events (view them)
CREATE POLICY "events_select_anon"
ON events FOR SELECT
TO anon
USING (true);

COMMENT ON POLICY "events_insert_anon" ON events IS
  'Allow anonymous API calls to insert events (for Make.com and other automation)';

COMMENT ON POLICY "events_select_anon" ON events IS
  'Allow anonymous API calls to view events (for public API access)';
