-- Row Level Security Policies for NYC Events Finder
-- Run this in Supabase SQL Editor AFTER the initial schema migration

-- =====================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingested_emails ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- EVENTS TABLE
-- =====================================================================

-- Policy: Anyone authenticated can view all events
CREATE POLICY "events_select_authenticated"
ON events FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert events (for manual entry)
CREATE POLICY "events_insert_authenticated"
ON events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can update their own manually created events
-- Note: For multi-user setup, you'd need a user_id column on events
CREATE POLICY "events_update_authenticated"
ON events FOR UPDATE
TO authenticated
USING (created_via = 'manual');

-- Policy: Users can delete their own manually created events
CREATE POLICY "events_delete_authenticated"
ON events FOR DELETE
TO authenticated
USING (created_via = 'manual');

-- Policy: Service role (Edge Functions, Make.com) can do anything
CREATE POLICY "events_all_service_role"
ON events FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================================
-- USER_EVENT_REACTIONS TABLE
-- =====================================================================

-- Policy: Users can view only their own reactions
CREATE POLICY "reactions_select_own"
ON user_event_reactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own reactions
CREATE POLICY "reactions_insert_own"
ON user_event_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reactions
CREATE POLICY "reactions_update_own"
ON user_event_reactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reactions
CREATE POLICY "reactions_delete_own"
ON user_event_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for Edge Functions)
CREATE POLICY "reactions_all_service_role"
ON user_event_reactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================================
-- SOURCES TABLE
-- =====================================================================

-- Policy: Anyone authenticated can view all sources
-- Sources are global - everyone benefits from discovering sources
CREATE POLICY "sources_select_authenticated"
ON sources FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert sources (for manual additions)
CREATE POLICY "sources_insert_authenticated"
ON sources FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update sources (e.g., changing status from suggested to subscribed)
CREATE POLICY "sources_update_authenticated"
ON sources FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Note: Typically you wouldn't allow deleting sources, but if needed:
-- CREATE POLICY "sources_delete_authenticated"
-- ON sources FOR DELETE
-- TO authenticated
-- USING (status = 'rejected' OR status = 'blacklisted');

-- Policy: Service role can do anything
CREATE POLICY "sources_all_service_role"
ON sources FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================================
-- SOURCE_DISCOVERIES TABLE
-- =====================================================================

-- Policy: Anyone authenticated can view discovery history
CREATE POLICY "discoveries_select_authenticated"
ON source_discoveries FOR SELECT
TO authenticated
USING (true);

-- Policy: Service role can insert discoveries (from Make.com)
CREATE POLICY "discoveries_insert_service_role"
ON source_discoveries FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Service role can do anything
CREATE POLICY "discoveries_all_service_role"
ON source_discoveries FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================================
-- NEWSLETTER_SUBSCRIPTIONS TABLE
-- =====================================================================

-- Policy: Anyone authenticated can view all subscriptions
-- (For single-user: you want to see all your subscriptions)
-- (For multi-user: you might want to filter by subscription_email)
CREATE POLICY "subscriptions_select_authenticated"
ON newsletter_subscriptions FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert subscriptions
CREATE POLICY "subscriptions_insert_authenticated"
ON newsletter_subscriptions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update subscriptions
CREATE POLICY "subscriptions_update_authenticated"
ON newsletter_subscriptions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Service role can do anything
CREATE POLICY "subscriptions_all_service_role"
ON newsletter_subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================================
-- INGESTED_EMAILS TABLE
-- =====================================================================

-- Policy: Anyone authenticated can view all ingested emails
CREATE POLICY "emails_select_authenticated"
ON ingested_emails FOR SELECT
TO authenticated
USING (true);

-- Policy: Service role can insert emails (from Make.com)
CREATE POLICY "emails_insert_service_role"
ON ingested_emails FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Service role can update emails (for parsing status)
CREATE POLICY "emails_update_service_role"
ON ingested_emails FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Service role can do anything
CREATE POLICY "emails_all_service_role"
ON ingested_emails FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================================
-- MULTI-USER CONSIDERATIONS
-- =====================================================================

/*
If you want to support multiple users, each with their own events and reactions,
you would need to modify the schema and policies:

1. ADD user_id to events table:
   ALTER TABLE events ADD COLUMN user_id UUID REFERENCES auth.users(id);
   CREATE INDEX idx_events_user_id ON events(user_id);

2. UPDATE events policies to filter by user_id:

   CREATE POLICY "events_select_own"
   ON events FOR SELECT
   TO authenticated
   USING (auth.uid() = user_id OR user_id IS NULL);  -- NULL for global events

   CREATE POLICY "events_insert_own"
   ON events FOR INSERT
   TO authenticated
   WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "events_update_own"
   ON events FOR UPDATE
   TO authenticated
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "events_delete_own"
   ON events FOR DELETE
   TO authenticated
   USING (auth.uid() = user_id);

3. For sources: You could keep sources global (everyone benefits from discoveries)
   OR add user_id to sources if you want private source lists.

4. For newsletter_subscriptions: Filter by subscription_email matching user's email

   CREATE POLICY "subscriptions_select_own"
   ON newsletter_subscriptions FOR SELECT
   TO authenticated
   USING (subscription_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
*/

-- =====================================================================
-- HELPER FUNCTION: Get current user's email
-- =====================================================================

CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================================
-- ANON ACCESS (for public APIs if needed)
-- =====================================================================

-- If you want to allow anonymous (non-authenticated) users to view events:
-- CREATE POLICY "events_select_anon"
-- ON events FOR SELECT
-- TO anon
-- USING (true);

-- For now, we keep everything authenticated-only for security

COMMENT ON POLICY "events_select_authenticated" ON events IS
  'Authenticated users can view all events';

COMMENT ON POLICY "reactions_select_own" ON user_event_reactions IS
  'Users can only see their own reactions';

COMMENT ON POLICY "sources_select_authenticated" ON sources IS
  'Sources are global - everyone can discover and benefit from them';
