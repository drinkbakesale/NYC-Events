# NYC Events Finder

A highly automated personal events discovery system that finds interesting NYC events through newsletter subscriptions, powered by Supabase, Make.com, and email automation.

## Overview

This system helps you discover cool NYC events by:

1. **Learning from your preferences**: When you like an event, it searches the web to find where that event was published
2. **Discovering sources**: It identifies blogs, venues, and curators that publish events you might like
3. **Finding newsletters**: It automatically checks if these sources have newsletters you can subscribe to
4. **Ingesting newsletters**: It processes emails from your dedicated events inbox
5. **Extracting events**: (Future) It parses newsletter emails to create new event listings

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
│                  (Frontend - to be built)                        │
│                                                                  │
│  - Browse events                                                │
│  - 👍 Like / 👎 Dislike events                                   │
│  - Manage newsletter sources                                    │
│  - Subscribe to suggested newsletters                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                      │  │
│  │  - events, sources, reactions, ingested_emails           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno/TypeScript)                        │  │
│  │  - like-event: Triggers source discovery                │  │
│  │  - analyze-source: Checks for newsletter signup         │  │
│  │  - ingest-email: Stores newsletter emails               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬────────────────────────────┬────────────────────────────┘
         │                            │
         │                            │
         ▼                            ▼
┌────────────────────┐      ┌────────────────────────────┐
│    MAKE.COM        │      │   GMAIL INBOX              │
│                    │      │   (events@...)             │
│  Scenario 1:       │      │                            │
│  - Search API      │      │  Receives newsletters      │
│  - Domain extract  │      │  from discovered sources   │
│  - Source upsert   │      │                            │
│  - Trigger analyze │      │                            │
│                    │      │                            │
│  Scenario 2:       │◄─────┤                            │
│  - Watch Gmail     │      │                            │
│  - Call ingest     │      │                            │
└────────────────────┘      └────────────────────────────┘
```

## Tech Stack

- **Database**: Supabase (PostgreSQL)
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Automation**: Make.com
- **Email**: Gmail (dedicated inbox)
- **Search**: Google Custom Search or Bing Web Search API
- **Frontend**: (To be built - React/Next.js recommended)

## Quick Start

### Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Make.com Account**: Sign up at [make.com](https://make.com)
3. **Gmail Account**: Create a dedicated email for newsletter subscriptions (e.g., `nyc-events@gmail.com`)
4. **Search API Key**: Get a Google Custom Search API key OR Bing Web Search API key

### Setup Steps

#### 1. Set Up Supabase Project

1. Create a new Supabase project
2. Go to SQL Editor and run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
3. Note your project details:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon key: (for frontend)
   - Service role key: (for backend/Make.com - keep secret!)

#### 2. Deploy Edge Functions

Deploy the three Edge Functions to Supabase:

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Functions
supabase functions deploy like-event
supabase functions deploy analyze-source
supabase functions deploy ingest-email
```

#### 3. Set Environment Variables

In Supabase Dashboard > Edge Functions > Secrets, add:

```
MAKE_WEBHOOK_URL_LIKE_EVENT=https://hook.make.com/xxxxx
```

(You'll get this URL when setting up Make.com Scenario 1)

#### 4. Set Up Make.com Scenarios

Follow the detailed instructions in [`docs/make-scenarios.md`](docs/make-scenarios.md):

1. **Scenario 1**: Source Discovery on Event Like
   - Create webhook trigger
   - Add search API module
   - Configure domain extraction and source upsert
   - Call analyze-source function

2. **Scenario 2**: Email Ingestion
   - Connect Gmail account
   - Watch for new emails
   - Call ingest-email function

#### 5. Configure Gmail

1. Create filters/labels to organize incoming newsletters
2. Consider setting up auto-forwarding if using a different email provider
3. Make sure Make.com has OAuth access to your Gmail account

### Testing

#### Test the Database

```sql
-- Insert a test event
INSERT INTO events (title, venue_name, neighborhood, start_time)
VALUES ('Test Concert', 'Brooklyn Steel', 'Williamsburg', NOW() + INTERVAL '7 days')
RETURNING *;
```

#### Test Edge Functions

```bash
# Test like-event function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/like-event \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "event_id": "EVENT_ID_FROM_ABOVE"
  }'
```

#### Test Make.com Integration

1. Like an event (trigger Scenario 1)
2. Send a test email to your events inbox (trigger Scenario 2)
3. Check Make.com execution history
4. Verify data in Supabase tables

## Database Schema

### Core Tables

#### `events`
Stores individual events discovered via newsletters or manual entry.

Key fields:
- `title`, `description`
- `start_time`, `end_time`
- `venue_name`, `neighborhood`
- `source_id` (links to sources table)
- `created_via` (manual, newsletter, import, other)

#### `user_event_reactions`
Tracks user likes/dislikes for events.

Key fields:
- `user_id`, `event_id`
- `reaction` (like, dislike)

#### `sources`
Domains and sources that publish events.

Key fields:
- `domain` (e.g., 'brooklynbased.com')
- `display_name`
- `status` (unseen, suggested, subscribed, rejected, blacklisted)
- `newsletter_signup_url`
- `candidate_type` (editorial_events_site, venue_site, other)
- `times_seen_in_search`

#### `source_discoveries`
History of how sources were discovered via search.

Key fields:
- `source_id`, `event_id`
- `search_query`, `result_url`

#### `newsletter_subscriptions`
Tracks subscription status for each source.

Key fields:
- `source_id`
- `subscription_email`
- `subscription_status` (pending, active, unsubscribed, failed)
- `last_email_seen_at`

#### `ingested_emails`
Raw emails from the newsletter inbox.

Key fields:
- `raw_email_id` (Gmail message ID)
- `source_id`
- `from_address`, `subject`
- `html_body`
- `parsed_status` (pending, parsed, failed)
- `parsed_events_count`

See [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) for complete schema.

## Edge Functions

### `like-event`

**Purpose**: Handles user liking an event and triggers source discovery.

**Input**:
```json
{
  "user_id": "uuid",
  "event_id": "uuid"
}
```

**Process**:
1. Inserts reaction into `user_event_reactions`
2. Fetches event details
3. Generates search queries
4. Calls Make.com webhook to trigger search

### `analyze-source`

**Purpose**: Analyzes a domain to determine if it's an events site and looks for newsletter signup.

**Input**:
```json
{
  "source_id": "uuid",
  "domain": "example.com",
  "sample_url": "https://example.com/events/..."
}
```

**Process**:
1. Fetches the sample URL and/or homepage
2. Uses heuristics to determine if it's an events site
3. Looks for newsletter signup forms/links
4. Updates `sources` table with findings

### `ingest-email`

**Purpose**: Ingests emails from the newsletter inbox (called by Make.com).

**Input**:
```json
{
  "raw_email_id": "gmail-message-id",
  "from_address": "hello@example.com",
  "subject": "This Week's Events",
  "received_at": "2025-01-15T12:34:56Z",
  "html_body": "<html>...</html>"
}
```

**Process**:
1. Checks for duplicate (idempotent on `raw_email_id`)
2. Extracts domain from sender
3. Matches to source in database
4. Inserts into `ingested_emails`
5. (Future) Parses HTML for events

## Development Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Database schema
- [x] Edge Functions
- [x] Make.com integration
- [x] Email ingestion

### Phase 2: Email Parsing (Next)
- [ ] Implement HTML parsing in `ingest-email`
- [ ] Extract events from newsletter HTML
- [ ] Handle different newsletter formats
- [ ] Use AI/LLM for extraction (optional)

### Phase 3: Frontend
- [ ] Event listing page
- [ ] Event detail view with 👍/👎 buttons
- [ ] Suggested newsletters page
- [ ] Source management dashboard
- [ ] Search and filters

### Phase 4: Enhancements
- [ ] Calendar integration (ics export)
- [ ] Event recommendations based on likes
- [ ] Collaborative filtering
- [ ] Share events with friends
- [ ] Mobile app

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

- **Events**: Authenticated users can view all, insert/update/delete their own
- **Reactions**: Users can only see and modify their own reactions
- **Sources**: Global (everyone can view and suggest)
- **Ingested Emails**: View-only for authenticated users, write for service role

See [`supabase/migrations/002_rls_policies.sql`](supabase/migrations/002_rls_policies.sql) for details.

### API Keys

**Never commit these to version control:**
- Supabase service role key
- Search API keys
- Make.com webhook URLs

Use environment variables and Supabase Secrets.

## Contributing

This is a personal project, but if you want to build something similar:

1. Fork this repo
2. Set up your own Supabase project
3. Configure your own Make.com scenarios
4. Customize for your city/interests

## Future Ideas

- **Multi-city support**: Expand beyond NYC
- **Event categories**: Music, art, food, sports, etc.
- **Price filtering**: Free events, cheap events, etc.
- **Friend recommendations**: See what events your friends liked
- **RSVP tracking**: Keep track of events you're attending
- **Notifications**: Get notified about events matching your interests
- **Integration with ticketing**: Direct links to purchase tickets
- **Social features**: Comments, sharing, event photos

## Troubleshooting

See the troubleshooting section in [`docs/make-scenarios.md`](docs/make-scenarios.md).

Common issues:
- Make.com webhook not receiving data
- Search API rate limits
- Email parsing failures
- Duplicate emails

## License

MIT License - feel free to use this for your own projects!

## Questions?

Open an issue in this repo or check the documentation files:
- [`docs/make-scenarios.md`](docs/make-scenarios.md) - Detailed Make.com setup
- [`supabase/migrations/`](supabase/migrations/) - Database schema and RLS policies
- [`supabase/functions/`](supabase/functions/) - Edge Function source code
