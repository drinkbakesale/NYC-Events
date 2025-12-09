# NYC Events Finder - Setup Guide

Complete step-by-step guide to get your NYC Events Finder system up and running.

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] A Supabase account ([sign up](https://supabase.com))
- [ ] A Make.com account ([sign up](https://make.com))
- [ ] A dedicated Gmail account for event newsletters
- [ ] Google Custom Search API key OR Bing Web Search API key
- [ ] Node.js installed (for Supabase CLI)
- [ ] Git installed

## Part 1: Supabase Setup

### Step 1.1: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose an organization
4. Enter project details:
   - **Name**: `nyc-events-finder`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
5. Click "Create new project"
6. Wait ~2 minutes for provisioning

### Step 1.2: Get API Keys

1. In your Supabase project, go to **Settings** > **API**
2. Copy these values (you'll need them later):
   ```
   Project URL: https://xxxxx.supabase.co
   Anon/Public Key: eyJhbG...
   Service Role Key: eyJhbG... (keep this secret!)
   ```

### Step 1.3: Run Database Migrations

1. Go to **SQL Editor** in Supabase Dashboard
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. You should see "Success. No rows returned"
6. Repeat for `002_rls_policies.sql`
7. Repeat for `003_helper_functions.sql`

**Verify**: Go to **Table Editor** and you should see 6 tables:
- events
- sources
- user_event_reactions
- source_discoveries
- newsletter_subscriptions
- ingested_emails

### Step 1.4: Deploy Edge Functions

**Option A: Using Supabase CLI (recommended)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy like-event
supabase functions deploy analyze-source
supabase functions deploy ingest-email

# Verify deployment
supabase functions list
```

**Option B: Manual Deployment via Dashboard**

1. Go to **Edge Functions** in Supabase Dashboard
2. Click "Create a new function"
3. For each function:
   - Name: `like-event`, `analyze-source`, `ingest-email`
   - Copy code from respective `supabase/functions/*/index.ts`
   - Click "Deploy"

**Verify**: Your Edge Functions should be accessible at:
- `https://YOUR_PROJECT.supabase.co/functions/v1/like-event`
- `https://YOUR_PROJECT.supabase.co/functions/v1/analyze-source`
- `https://YOUR_PROJECT.supabase.co/functions/v1/ingest-email`

---

## Part 2: Search API Setup

Choose **either** Google Custom Search **or** Bing Web Search.

### Option A: Google Custom Search (Free tier: 100 queries/day)

#### Step 2A.1: Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Custom Search API":
   - Go to **APIs & Services** > **Library**
   - Search for "Custom Search API"
   - Click "Enable"
4. Create API credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. Optional: Restrict the API key to Custom Search API only

#### Step 2A.2: Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com)
2. Click "Add" or "Create a search engine"
3. Configuration:
   - **Sites to search**: `www.google.com` (we'll search the entire web)
   - **Name**: `NYC Events Finder`
4. Click "Create"
5. In the Control Panel:
   - Click "Setup" > "Search the entire web": **ON**
   - Click "Setup" > Copy the **Search Engine ID** (looks like `012345678901234567890:abcdefgh`)

**Save these values**:
```
GOOGLE_SEARCH_API_KEY=AIzaSy...
GOOGLE_SEARCH_ENGINE_ID=012345678901234567890:abcdefgh
```

### Option B: Bing Web Search (Azure)

#### Step 2B.1: Create Azure Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign up or sign in
3. You may get free credits for new accounts

#### Step 2B.2: Create Bing Search Resource

1. In Azure Portal, click "Create a resource"
2. Search for "Bing Search v7"
3. Click "Create"
4. Configuration:
   - **Subscription**: Choose your subscription
   - **Resource Group**: Create new or use existing
   - **Region**: Choose closest
   - **Name**: `nyc-events-search`
   - **Pricing tier**: F1 (Free) or S1 (Paid)
5. Click "Review + Create" > "Create"
6. Once deployed, go to the resource
7. Go to **Keys and Endpoint**
8. Copy **Key 1**

**Save this value**:
```
BING_SEARCH_API_KEY=abc123...
```

---

## Part 3: Gmail Setup

### Step 3.1: Create Dedicated Email

1. Create a new Gmail account (e.g., `nyc-events-your-name@gmail.com`)
2. This will be your dedicated inbox for event newsletters
3. **Save the credentials**

### Step 3.2: Configure Gmail

1. Log into the Gmail account
2. Create a label: "Events Newsletters" (optional but recommended)
3. Set up filters (optional):
   - Auto-label emails from known sources
   - Skip inbox for newsletters (keep inbox clean)

### Step 3.3: Allow Less Secure Apps (if needed)

For Make.com to access Gmail:
1. Gmail should work with OAuth2 (recommended)
2. Make.com will prompt you to connect your account
3. Follow the OAuth flow when setting up Make.com

---

## Part 4: Make.com Setup

### Step 4.1: Create Account

1. Go to [make.com](https://make.com)
2. Sign up for an account
3. Verify your email

### Step 4.2: Scenario 1 - Source Discovery

#### Create Scenario

1. Click "Create a new scenario"
2. Name it "NYC Events - Source Discovery"

#### Module 1: Webhook Trigger

1. Click the "+" to add module
2. Search for "Webhooks"
3. Choose "Custom webhook"
4. Click "Add" to create a new webhook
5. Name it "like-event-trigger"
6. **Copy the webhook URL** (looks like `https://hook.make.com/abc123...`)
7. Click "OK"

#### Add Webhook URL to Supabase

1. In Supabase Dashboard, go to **Edge Functions** > **like-event**
2. Click "Settings" or "Manage secrets"
3. Add secret:
   - **Name**: `MAKE_WEBHOOK_URL_LIKE_EVENT`
   - **Value**: `https://hook.make.com/abc123...` (your webhook URL)
4. Save

#### Module 2: Iterator (Search Queries)

1. Add new module
2. Search for "Iterator"
3. Choose "Flow Control > Iterator"
4. **Array**: Click the field and select `search_queries` from the webhook data
5. Click "OK"

#### Module 3: Search API

**For Google:**

1. Add new module > HTTP > Make a request
2. Configuration:
   - **URL**: `https://www.googleapis.com/customsearch/v1`
   - **Method**: GET
   - **Query String**:
     - `key`: Your Google API Key
     - `cx`: Your Search Engine ID
     - `q`: Map to `{{2.value}}` (the current search query)
     - `num`: `10`
3. Click "OK"

**For Bing:**

1. Add new module > HTTP > Make a request
2. Configuration:
   - **URL**: `https://api.bing.microsoft.com/v7.0/search`
   - **Method**: GET
   - **Headers**:
     - `Ocp-Apim-Subscription-Key`: Your Bing API Key
   - **Query String**:
     - `q`: Map to `{{2.value}}`
     - `count`: `10`
3. Click "OK"

#### Module 4: Iterator (Search Results)

1. Add new module > Flow Control > Iterator
2. **Array**:
   - For Google: `{{3.items}}`
   - For Bing: `{{3.webPages.value}}`

#### Module 5: Text Parser (Extract Domain)

1. Add new module > Tools > Text parser > Match pattern
2. Configuration:
   - **Pattern**: `^(?:https?:\/\/)?(?:www\.)?([^\/]+)`
   - **Text**:
     - For Google: `{{4.link}}`
     - For Bing: `{{4.url}}`
3. Click "OK"

#### Module 6: Router with Filter (Blacklist)

1. Add module > Flow Control > Router
2. Add filter to the route:
   - **Label**: "Not blacklisted"
   - **Condition**: `{{5.$1}}` does not contain `eventbrite.com` AND
   - does not contain `ticketmaster.com` AND
   - does not contain `facebook.com` AND
   - does not contain `meetup.com` AND
   - does not contain `timeout.com`

#### Module 7: Upsert Source

1. Add module > HTTP > Make a request
2. Configuration:
   - **URL**: `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/upsert_source`
   - **Method**: POST
   - **Headers**:
     - `apikey`: Your Supabase Service Role Key
     - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type`: `application/json`
     - `Prefer`: `return=representation`
   - **Body** (JSON):
     ```json
     {
       "p_domain": "{{5.$1}}",
       "p_event_id": "{{1.event_id}}"
     }
     ```

#### Module 8: Insert Source Discovery

1. Add module > HTTP > Make a request
2. Configuration:
   - **URL**: `https://YOUR_PROJECT.supabase.co/rest/v1/source_discoveries`
   - **Method**: POST
   - **Headers**: Same as Module 7
   - **Body** (JSON):
     ```json
     {
       "source_id": "{{7.id}}",
       "event_id": "{{1.event_id}}",
       "search_query": "{{2.value}}",
       "result_url": "{{4.link}}"
     }
     ```

#### Module 9: Filter (New/Unseen Sources)

1. Add module > Flow Control > Filter
2. Condition:
   - `{{7.is_new}}` = `true` OR
   - `{{7.status}}` = `unseen`

#### Module 10: Analyze Source

1. Add module > HTTP > Make a request
2. Configuration:
   - **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/analyze-source`
   - **Method**: POST
   - **Headers**:
     - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type`: `application/json`
   - **Body** (JSON):
     ```json
     {
       "source_id": "{{7.id}}",
       "domain": "{{7.domain}}",
       "sample_url": "{{4.link}}"
     }
     ```

#### Save and Activate

1. Click "Save" (bottom left)
2. Toggle "Scheduling" to ON
3. The scenario will now run whenever the webhook is triggered

### Step 4.3: Scenario 2 - Email Ingestion

#### Create Scenario

1. Create a new scenario
2. Name it "NYC Events - Email Ingestion"

#### Module 1: Gmail Trigger

1. Add module > Gmail > Watch emails
2. Click "Create a connection"
3. Follow OAuth flow to connect your events Gmail account
4. Configuration:
   - **Folder**: INBOX (or your "Events Newsletters" label)
   - **Criteria**: All emails
   - **Max results**: 10
5. Click "OK"

#### Module 2: Call Ingest-Email Function

1. Add module > HTTP > Make a request
2. Configuration:
   - **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/ingest-email`
   - **Method**: POST
   - **Headers**:
     - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type`: `application/json`
   - **Body** (JSON):
     ```json
     {
       "raw_email_id": "{{1.id}}",
       "from_address": "{{1.from}}",
       "subject": "{{1.subject}}",
       "received_at": "{{formatDate(1.date; "YYYY-MM-DDTHH:mm:ssZ")}}",
       "html_body": "{{1.textHtml}}"
     }
     ```
3. Click "OK"

#### Optional: Module 3: Log to Google Sheets

1. Add module > Google Sheets > Add a row
2. Create/select a logging spreadsheet
3. Map fields:
   - Email ID: `{{1.id}}`
   - From: `{{1.from}}`
   - Subject: `{{1.subject}}`
   - Ingested ID: `{{2.ingested_email_id}}`
   - Status: `{{2.status}}`

#### Save and Activate

1. Click "Save"
2. Toggle "Scheduling" to ON
3. Set schedule (e.g., every 15 minutes)
4. The scenario will now check for new emails automatically

---

## Part 5: Testing

### Test 1: Database

```sql
-- In Supabase SQL Editor, create a test event
INSERT INTO events (title, venue_name, neighborhood, start_time)
VALUES ('Test Jazz Night', 'Blue Note', 'Greenwich Village', NOW() + INTERVAL '7 days')
RETURNING *;

-- Create a test user (or use your own user_id from auth.users)
-- For testing, you can use a dummy UUID
-- In production, you'd get this from authentication
```

### Test 2: Like Event (Trigger Source Discovery)

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/like-event \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_id": "YOUR_EVENT_ID_FROM_TEST_1"
  }'
```

**Expected**:
1. Check Make.com Scenario 1 execution history - should show a run
2. Check Supabase `sources` table - should have new entries
3. Check Supabase `source_discoveries` table - should have records

### Test 3: Email Ingestion

1. Send a test email to your events inbox Gmail
2. Wait for Make.com Scenario 2 to run (or run it manually)
3. Check Make.com execution history
4. Query ingested_emails:

```sql
SELECT * FROM ingested_emails ORDER BY created_at DESC LIMIT 5;
```

---

## Part 6: Configuration File

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your values:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

MAKE_WEBHOOK_URL_LIKE_EVENT=https://hook.make.com/xxxxx

GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_id

EVENTS_INBOX_EMAIL=nyc-events@gmail.com
```

---

## Troubleshooting

### Issue: Webhook not receiving data

1. Check Make.com webhook URL is correct
2. Verify environment variable in Supabase Edge Function
3. Check Edge Function logs in Supabase Dashboard
4. Test webhook with curl directly

### Issue: Search API errors

1. Verify API key is valid
2. Check quota/rate limits
3. Test API directly with curl
4. Check Make.com execution logs for error details

### Issue: No sources being created

1. Check Make.com execution history for errors
2. Verify Supabase REST API permissions
3. Check that `upsert_source` function exists
4. Review filter logic (might be too restrictive)

### Issue: Emails not being ingested

1. Verify Gmail connection in Make.com
2. Check scenario schedule is active
3. Review Edge Function logs
4. Test `ingest-email` function with curl

---

## Next Steps

Once everything is working:

1. **Subscribe to newsletters**:
   - Check `suggested_sources` view in Supabase
   - Manually subscribe to promising newsletters
   - Mark sources as 'subscribed' in database

2. **Build frontend**:
   - Use Next.js or your preferred framework
   - Connect to Supabase
   - Display events and sources
   - Add like/dislike buttons

3. **Implement email parsing**:
   - Add HTML parsing logic to `ingest-email` function
   - Extract events from newsletter HTML
   - Create events automatically

4. **Monitor and refine**:
   - Check Make.com executions regularly
   - Add more blacklisted domains as needed
   - Adjust search queries for better results

---

## Support

If you get stuck:
1. Check the troubleshooting section
2. Review Make.com execution logs
3. Check Supabase Edge Function logs
4. Open an issue in the GitHub repo

Happy event discovering! 🎉
