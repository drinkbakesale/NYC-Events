# Make.com Integration Scenarios

This document describes how to set up Make.com scenarios to integrate with the NYC Events Finder system.

## Prerequisites

Before setting up these scenarios, you need:

1. **Supabase Project**: Your Supabase project URL and API keys
2. **Search API**: Google Custom Search API key or Bing Web Search API key
3. **Gmail Account**: A dedicated email address for receiving event newsletters
4. **Make.com Account**: Free or paid account on make.com

## Environment Setup

### Supabase API Configuration

You'll need these values from your Supabase project:

- **Supabase URL**: `https://your-project.supabase.co`
- **Supabase Anon Key**: For client-side calls (if needed)
- **Supabase Service Role Key**: For Make.com to call Edge Functions and REST API

### Edge Function URLs

Your Edge Functions will be available at:

- `https://your-project.supabase.co/functions/v1/like-event`
- `https://your-project.supabase.co/functions/v1/analyze-source`
- `https://your-project.supabase.co/functions/v1/ingest-email`

### Search API Configuration

Choose one:

**Option A: Google Custom Search**
- API Key: Get from Google Cloud Console
- Search Engine ID: Create a Custom Search Engine at programmablesearchengine.google.com
- API Endpoint: `https://www.googleapis.com/customsearch/v1`

**Option B: Bing Web Search**
- API Key: Get from Azure Portal
- API Endpoint: `https://api.bing.microsoft.com/v7.0/search`

---

## Scenario 1: Source Discovery on Event Like

**Purpose**: When a user likes an event, automatically search the web for related content, discover potential newsletter sources, and analyze them for newsletter signups.

### Flow Diagram

```
User Likes Event (Frontend)
  ↓
Supabase Edge Function: like-event
  ↓
Make.com Webhook (Scenario 1 starts here)
  ↓
For each search query:
  ↓
  Search API (Google/Bing)
  ↓
  Extract domains from results
  ↓
  Filter blacklisted domains
  ↓
  Upsert source in Supabase
  ↓
  Insert source_discovery record
  ↓
  If new/unseen: Call analyze-source Edge Function
```

### Step-by-Step Setup

#### 1. Create Custom Webhook Trigger

**Module**: Webhooks > Custom webhook

- Create a new webhook
- Copy the webhook URL
- Add this URL to your Supabase Edge Function environment variables as `MAKE_WEBHOOK_URL_LIKE_EVENT`

**Expected Payload** (from like-event Edge Function):

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Brooklyn Indie Film Premiere",
  "venue_name": "Nitehawk Cinema",
  "start_time": "2025-01-20T19:30:00Z",
  "neighborhood": "Williamsburg",
  "search_queries": [
    "\"Brooklyn Indie Film Premiere\" Nitehawk Cinema NYC",
    "\"Brooklyn Indie Film Premiere\" NYC",
    "\"Brooklyn Indie Film Premiere\" Williamsburg NYC",
    "Nitehawk Cinema events NYC"
  ]
}
```

#### 2. Iterator: Loop Through Search Queries

**Module**: Flow Control > Iterator

- **Array**: `{{1.search_queries}}`

This will process each search query one at a time.

#### 3. Search API Call

Choose either Google Custom Search OR Bing Web Search:

##### Option A: Google Custom Search

**Module**: HTTP > Make a request

- **URL**: `https://www.googleapis.com/customsearch/v1`
- **Method**: GET
- **Query String**:
  - `key`: `YOUR_GOOGLE_API_KEY`
  - `cx`: `YOUR_SEARCH_ENGINE_ID`
  - `q`: `{{2.value}}` (the current search query from iterator)
  - `num`: `10` (number of results)

**Response Example**:

```json
{
  "items": [
    {
      "title": "Brooklyn Indie Film Premiere at Nitehawk",
      "link": "https://brooklynbased.com/events/film-premiere",
      "displayLink": "brooklynbased.com"
    },
    {
      "title": "Nitehawk Cinema - Events",
      "link": "https://nitehawkcinema.com/calendar/film-premiere",
      "displayLink": "nitehawkcinema.com"
    }
  ]
}
```

##### Option B: Bing Web Search

**Module**: HTTP > Make a request

- **URL**: `https://api.bing.microsoft.com/v7.0/search`
- **Method**: GET
- **Headers**:
  - `Ocp-Apim-Subscription-Key`: `YOUR_BING_API_KEY`
- **Query String**:
  - `q`: `{{2.value}}`
  - `count`: `10`

**Response Example**:

```json
{
  "webPages": {
    "value": [
      {
        "name": "Brooklyn Indie Film Premiere at Nitehawk",
        "url": "https://brooklynbased.com/events/film-premiere",
        "displayUrl": "brooklynbased.com/events/film-premiere"
      }
    ]
  }
}
```

#### 4. Iterator: Loop Through Search Results

**Module**: Flow Control > Iterator

For Google: `{{3.items}}`
For Bing: `{{3.webPages.value}}`

#### 5. Extract Domain

**Module**: Tools > Set Variable

- **Variable name**: `domain`
- **Variable value**: Use a formula to extract domain

For Google:
```
{{4.displayLink}}
```

For Bing:
```
{{replace(replace(4.url; "https://"; ""); "http://"; "")}}
```

Then extract just the domain using regex or split functions.

Better approach - use a dedicated module:

**Module**: Tools > Text parser > Match pattern

- **Pattern**: `^(?:https?:\/\/)?(?:www\.)?([^\/]+)`
- **Text**: For Google `{{4.link}}`, For Bing `{{4.url}}`
- **Global match**: No

Use `{{5.$1}}` as the domain.

#### 6. Filter: Skip Blacklisted Domains

**Module**: Flow Control > Router with Filter

**Filter condition**: Domain is NOT one of:
- `eventbrite.com`
- `ticketmaster.com`
- `facebook.com`
- `meetup.com`
- `timeout.com`
- `instagram.com`
- `twitter.com`
- `tiktok.com`

#### 7. Upsert Source in Supabase

**Module**: HTTP > Make a request

**Method**: POST
**URL**: `https://your-project.supabase.co/rest/v1/rpc/upsert_source`

**Headers**:
- `apikey`: `YOUR_SUPABASE_SERVICE_ROLE_KEY`
- `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
- `Content-Type`: `application/json`
- `Prefer`: `return=representation`

**Body**:

```json
{
  "p_domain": "{{5.$1}}",
  "p_event_id": "{{1.event_id}}"
}
```

**Note**: You need to create a PostgreSQL function for this upsert. See SQL below.

**Alternative: Use Supabase REST API directly**

Since Supabase REST API doesn't support upsert with increment logic easily, you should create a database function:

```sql
-- Add this to your migration or run separately
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
  v_is_new BOOLEAN;
BEGIN
  -- Try to insert, on conflict update
  INSERT INTO sources (domain, first_discovered_from_event_id, times_seen_in_search)
  VALUES (p_domain, p_event_id, 1)
  ON CONFLICT (domain)
  DO UPDATE SET
    times_seen_in_search = sources.times_seen_in_search + 1,
    updated_at = NOW()
  RETURNING sources.id, sources.status INTO v_source_id, v_is_new;

  -- Check if this was a new insert (times_seen = 1) or update
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
$$ LANGUAGE plpgsql;
```

#### 8. Insert Source Discovery Record

**Module**: HTTP > Make a request

**Method**: POST
**URL**: `https://your-project.supabase.co/rest/v1/source_discoveries`

**Headers**:
- `apikey`: `YOUR_SUPABASE_SERVICE_ROLE_KEY`
- `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
- `Content-Type`: `application/json`
- `Prefer`: `return=minimal`

**Body**:

```json
{
  "source_id": "{{7.id}}",
  "event_id": "{{1.event_id}}",
  "search_query": "{{2.value}}",
  "result_url": "{{4.link}}"
}
```

Note: Adjust `{{4.link}}` based on whether you used Google or Bing.

#### 9. Filter: Only Process New or Unseen Sources

**Module**: Flow Control > Filter

**Condition**:
- `{{7.is_new}}` equals `true` OR
- `{{7.status}}` equals `unseen`

#### 10. Call Analyze-Source Edge Function

**Module**: HTTP > Make a request

**Method**: POST
**URL**: `https://your-project.supabase.co/functions/v1/analyze-source`

**Headers**:
- `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
- `Content-Type`: `application/json`

**Body**:

```json
{
  "source_id": "{{7.id}}",
  "domain": "{{7.domain}}",
  "sample_url": "{{4.link}}"
}
```

---

## Scenario 2: Email Ingestion from Gmail

**Purpose**: Automatically pull new emails from your dedicated events inbox and send them to Supabase for processing.

### Flow Diagram

```
New Email Arrives in Gmail
  ↓
Make.com Gmail Trigger
  ↓
Extract Email Data
  ↓
Call ingest-email Edge Function
  ↓
[Optional] Log to Google Sheet
```

### Step-by-Step Setup

#### 1. Gmail Trigger

**Module**: Gmail > Watch emails

**Configuration**:
- **Connection**: Connect your Gmail account (the dedicated events inbox)
- **Folder**: Choose the inbox or a specific label (e.g., "Events Newsletters")
- **Criteria**: All emails (or filter by specific criteria)
- **Maximum number of results**: 10 (adjust as needed)

**Output Example**:

```json
{
  "id": "18c1234567890abcd",
  "threadId": "18c1234567890abcd",
  "from": "hello@brooklynbased.com",
  "subject": "This Week's Best Brooklyn Events",
  "date": "2025-01-15T14:30:00.000Z",
  "textHtml": "<html>...</html>"
}
```

#### 2. Call Ingest-Email Edge Function

**Module**: HTTP > Make a request

**Method**: POST
**URL**: `https://your-project.supabase.co/functions/v1/ingest-email`

**Headers**:
- `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
- `Content-Type`: `application/json`

**Body**:

```json
{
  "raw_email_id": "{{1.id}}",
  "from_address": "{{1.from}}",
  "subject": "{{1.subject}}",
  "received_at": "{{formatDate(1.date; "YYYY-MM-DDTHH:mm:ssZ")}}",
  "html_body": "{{1.textHtml}}"
}
```

**Note on HTML body**: Gmail's `textHtml` field might be very large. If Make.com has issues with large payloads, you can:
- Truncate the HTML body
- Store the full HTML in Google Drive or S3 and pass a URL instead
- Omit the html_body and fetch it separately using Gmail API

**Response Example**:

```json
{
  "status": "ok",
  "message": "Email ingested successfully",
  "ingested_email_id": "660e8400-e29b-41d4-a716-446655440000",
  "source_id": "770e8400-e29b-41d4-a716-446655440000",
  "domain": "brooklynbased.com"
}
```

#### 3. [Optional] Log to Google Sheet

**Module**: Google Sheets > Add a row

**Configuration**:
- **Spreadsheet**: Select your logging spreadsheet
- **Sheet**: Choose the sheet name
- **Values**:
  - Email ID: `{{1.id}}`
  - From: `{{1.from}}`
  - Subject: `{{1.subject}}`
  - Received: `{{1.date}}`
  - Ingested Email ID: `{{2.ingested_email_id}}`
  - Source ID: `{{2.source_id}}`
  - Status: `{{2.status}}`
  - Timestamp: `{{now}}`

This is useful for debugging and monitoring the ingestion process.

#### 4. [Optional] Error Handling

**Module**: Tools > Error handler

Wrap steps 2-3 in an error handler to catch any failures:

- **Handler**: Add a route for errors
- **Action**: Log to Google Sheet or send notification
- **Resume**: Choose whether to continue or stop

---

## Testing Your Scenarios

### Test Scenario 1

1. In your Supabase SQL editor, insert a test event:

```sql
INSERT INTO events (title, venue_name, neighborhood, start_time)
VALUES ('Test Concert', 'Brooklyn Steel', 'Williamsburg', NOW() + INTERVAL '7 days')
RETURNING id;
```

2. Call your like-event Edge Function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/like-event \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "event_id": "EVENT_ID_FROM_STEP_1"
  }'
```

3. Check Make.com scenario execution history
4. Verify that sources and source_discoveries were created in Supabase

### Test Scenario 2

1. Send a test email to your events inbox Gmail account
2. Check Make.com scenario execution history
3. Verify that the email appears in `ingested_emails` table

```sql
SELECT * FROM ingested_emails ORDER BY created_at DESC LIMIT 5;
```

---

## Rate Limiting and Best Practices

### Search API Rate Limits

**Google Custom Search**:
- Free tier: 100 queries/day
- Paid tier: Up to 10,000 queries/day
- Consider adding delays between requests

**Bing Web Search**:
- Varies by subscription tier
- Monitor your usage in Azure Portal

### Make.com Execution Limits

- Free tier: 1,000 operations/month
- Consider using Make.com's built-in rate limiting tools
- Use aggregators to batch operations

### Supabase Considerations

- Edge Functions have a 10-second timeout by default
- Consider pagination for large result sets
- Use database indexes for performance

### Recommended Optimizations

1. **Batch source discoveries**: Instead of inserting one at a time, collect all and insert in a single batch
2. **Cache search results**: Store search results temporarily to avoid duplicate API calls
3. **Schedule email checks**: Don't check Gmail too frequently; every 15-30 minutes is usually sufficient
4. **Filter before processing**: Skip known social media and ticket platforms early in the flow

---

## Troubleshooting

### Common Issues

**Issue**: Make.com webhook not receiving data from like-event function

**Solution**:
- Check that MAKE_WEBHOOK_URL_LIKE_EVENT is set in Supabase Edge Function environment
- Verify webhook URL is correct
- Check Make.com webhook history for incoming requests

**Issue**: Search API returning errors

**Solution**:
- Verify API key is valid
- Check rate limits haven't been exceeded
- Test API directly with curl before using in Make.com

**Issue**: Emails not being ingested

**Solution**:
- Verify Gmail connection in Make.com
- Check that emails are in the correct folder/label
- Review Make.com execution history for errors
- Verify ingest-email Edge Function logs in Supabase

**Issue**: Duplicate emails being created

**Solution**:
- Ensure `raw_email_id` unique constraint exists in database
- Check that the idempotency logic in ingest-email function is working
- Verify Gmail module is not re-processing old emails

---

## Next Steps

After setting up these scenarios:

1. **Monitor execution**: Check Make.com regularly for failed executions
2. **Refine blacklist**: Add more domains to filter as you discover them
3. **Implement email parsing**: Add logic to extract events from HTML
4. **Build frontend**: Create UI for browsing events and managing sources
5. **Add notifications**: Alert yourself when new promising sources are discovered

---

## Appendix: Complete SQL for Helper Functions

```sql
-- Function to upsert sources (used in Scenario 1)
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
BEGIN
  INSERT INTO sources (domain, first_discovered_from_event_id, times_seen_in_search)
  VALUES (p_domain, p_event_id, 1)
  ON CONFLICT (domain)
  DO UPDATE SET
    times_seen_in_search = sources.times_seen_in_search + 1,
    updated_at = NOW()
  RETURNING sources.id INTO v_source_id;

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
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_source(TEXT, UUID) TO authenticated, anon, service_role;
```
