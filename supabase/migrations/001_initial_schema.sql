-- NYC Events Finder - Initial Schema Migration
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLE: events
-- =====================================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  venue_name TEXT,
  neighborhood TEXT,
  city TEXT DEFAULT 'New York',
  source_event_url TEXT,
  created_via TEXT DEFAULT 'manual' CHECK (created_via IN ('manual', 'newsletter', 'import', 'other')),
  source_id UUID, -- foreign key added after sources table is created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying events by time
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_source_id ON events(source_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- =====================================================================
-- TABLE: sources
-- =====================================================================
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  display_name TEXT,
  candidate_type TEXT DEFAULT 'other' CHECK (candidate_type IN ('editorial_events_site', 'venue_site', 'other')),
  status TEXT NOT NULL DEFAULT 'unseen' CHECK (status IN ('unseen', 'suggested', 'subscribed', 'rejected', 'blacklisted')),
  newsletter_signup_url TEXT,
  first_discovered_from_event_id UUID, -- foreign key added later
  times_seen_in_search INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on domain
CREATE UNIQUE INDEX idx_sources_domain_unique ON sources(domain);
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_sources_times_seen ON sources(times_seen_in_search DESC);

-- =====================================================================
-- TABLE: user_event_reactions
-- =====================================================================
CREATE TABLE user_event_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- references auth.users(id)
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one reaction per user per event
CREATE UNIQUE INDEX idx_user_event_reactions_unique ON user_event_reactions(user_id, event_id);
CREATE INDEX idx_user_event_reactions_user_id ON user_event_reactions(user_id);
CREATE INDEX idx_user_event_reactions_event_id ON user_event_reactions(event_id);

-- =====================================================================
-- TABLE: source_discoveries
-- =====================================================================
CREATE TABLE source_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  search_query TEXT,
  result_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_source_discoveries_source_id ON source_discoveries(source_id);
CREATE INDEX idx_source_discoveries_event_id ON source_discoveries(event_id);
CREATE INDEX idx_source_discoveries_created_at ON source_discoveries(created_at DESC);

-- =====================================================================
-- TABLE: newsletter_subscriptions
-- =====================================================================
CREATE TABLE newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  subscription_email TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'pending' CHECK (subscription_status IN ('pending', 'active', 'unsubscribed', 'failed')),
  subscribed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  last_email_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_newsletter_subscriptions_source_id ON newsletter_subscriptions(source_id);
CREATE INDEX idx_newsletter_subscriptions_status ON newsletter_subscriptions(subscription_status);
CREATE INDEX idx_newsletter_subscriptions_email ON newsletter_subscriptions(subscription_email);

-- =====================================================================
-- TABLE: ingested_emails
-- =====================================================================
CREATE TABLE ingested_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  raw_email_id TEXT NOT NULL,
  from_address TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ,
  html_body TEXT,
  parsed_status TEXT NOT NULL DEFAULT 'pending' CHECK (parsed_status IN ('pending', 'parsed', 'failed')),
  parsed_events_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on raw_email_id for idempotency
CREATE UNIQUE INDEX idx_ingested_emails_raw_email_id_unique ON ingested_emails(raw_email_id);
CREATE INDEX idx_ingested_emails_source_id ON ingested_emails(source_id);
CREATE INDEX idx_ingested_emails_received_at ON ingested_emails(received_at DESC);
CREATE INDEX idx_ingested_emails_parsed_status ON ingested_emails(parsed_status);

-- =====================================================================
-- ADD FOREIGN KEYS (after all tables exist)
-- =====================================================================

-- Add foreign key from events to sources
ALTER TABLE events
ADD CONSTRAINT fk_events_source_id
FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL;

-- Add foreign key from sources to events (circular reference, nullable)
ALTER TABLE sources
ADD CONSTRAINT fk_sources_first_discovered_from_event_id
FOREIGN KEY (first_discovered_from_event_id) REFERENCES events(id) ON DELETE SET NULL;

-- =====================================================================
-- TRIGGERS FOR updated_at
-- =====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscriptions_updated_at BEFORE UPDATE ON newsletter_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingested_emails_updated_at BEFORE UPDATE ON ingested_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- SEED DATA (optional blacklisted domains)
-- =====================================================================

-- Insert some common domains that should be blacklisted
INSERT INTO sources (domain, status, candidate_type, times_seen_in_search)
VALUES
  ('eventbrite.com', 'blacklisted', 'other', 0),
  ('ticketmaster.com', 'blacklisted', 'other', 0),
  ('facebook.com', 'blacklisted', 'other', 0),
  ('meetup.com', 'blacklisted', 'other', 0),
  ('timeout.com', 'blacklisted', 'other', 0)
ON CONFLICT (domain) DO NOTHING;

COMMENT ON TABLE events IS 'Stores individual events discovered via newsletters or manual entry';
COMMENT ON TABLE sources IS 'Domains and sources that publish events (newsletters, venue sites, etc.)';
COMMENT ON TABLE user_event_reactions IS 'User likes/dislikes for events - drives source discovery';
COMMENT ON TABLE source_discoveries IS 'History of how sources were discovered via search results';
COMMENT ON TABLE newsletter_subscriptions IS 'Tracks subscription status for each source';
COMMENT ON TABLE ingested_emails IS 'Raw emails pulled from the events inbox for parsing';
