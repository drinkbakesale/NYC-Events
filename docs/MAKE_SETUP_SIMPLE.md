# 🔗 Make.com Setup - Visual Guide

Now let's connect everything together with Make.com automation!

You need to create **2 scenarios** (think of them as automated workflows).

---

## 📍 Before You Start

Have these ready:
- ✅ Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- ✅ Your Supabase **service_role** key (the long secret one)
- ✅ Your Google Search API key + Search Engine ID
- ✅ Your events Gmail account login

---

# Scenario 1: Discover Sources When You Like Events

**What this does**: When you like an event, it automatically searches Google for where that event was published, finds the websites, and checks if they have newsletters.

## Visual Flow

```
Like Event → Search Google → Find Websites → Save to Database → Check for Newsletters
```

---

## Step-by-Step Setup

### 1. Create New Scenario

1. Log into **https://make.com**
2. Click **"Create a new scenario"** (big button)
3. You'll see a blank canvas with a **"+"** button

### 2. Add Webhook Trigger

1. Click the **"+"** button
2. In the search box, type: **"webhook"**
3. Click **"Webhooks"** (with a hook icon)
4. Click **"Custom webhook"**
5. Click **"Add"** to create a new webhook
6. Give it a name: `like-event-trigger`
7. **IMPORTANT**: Copy the webhook URL that appears (it looks like `https://hook.make.com/abc123xyz...`)
8. Click **"OK"**

**Save this URL - you'll need it in a moment!**

### 3. Add Webhook URL to Supabase

We need to tell Supabase about this webhook.

1. Go to your **Supabase dashboard**
2. Click **"Edge Functions"** in sidebar
3. Click the **"like-event"** function
4. Look for **"Environment variables"** or **"Secrets"** section
5. Click **"Add secret"** or **"Add variable"**
6. **Name**: `MAKE_WEBHOOK_URL_LIKE_EVENT`
7. **Value**: Paste the webhook URL you just copied
8. Click **"Save"** or **"Add"**

### 4. Back to Make.com - Add Iterator

1. Click the **"+"** after your webhook module
2. Search for: **"iterator"**
3. Click **"Flow Control"** → **"Iterator"**
4. Click the **"Array"** field
5. You'll see a list of variables - click **"search_queries"**
   - If you don't see it yet, that's OK - just type: `{{1.search_queries}}`
6. Click **"OK"**

### 5. Add Google Search

1. Click the **"+"** after Iterator
2. Search for: **"http"**
3. Click **"HTTP"** → **"Make a request"**
4. Fill in:
   - **URL**: `https://www.googleapis.com/customsearch/v1`
   - **Method**: Select **"GET"**

5. Under **"Query String"**, click **"Add item"** 4 times and fill in:
   - **Key**: `key` → **Value**: Your Google API Key
   - **Key**: `cx` → **Value**: Your Search Engine ID
   - **Key**: `q` → **Value**: Click field, select `{{2.value}}` from the iterator
   - **Key**: `num` → **Value**: `10`

6. Click **"OK"**

### 6. Add Another Iterator (for search results)

1. Click **"+"** after the HTTP module
2. Add **"Iterator"** again
3. **Array**: Click field, select `{{3.items}}` or type `3.items`
4. Click **"OK"**

### 7. Extract Domain Name

1. Click **"+"** after the second iterator
2. Search for: **"text parser"**
3. Click **"Tools"** → **"Text parser"** → **"Match pattern"**
4. Fill in:
   - **Pattern**: `^(?:https?:\/\/)?(?:www\.)?([^\/]+)`
   - **Text**: Click field, select `{{4.link}}` or type `4.link`
5. Click **"OK"**

### 8. Add Filter (Skip Bad Domains)

1. Click **"+"** after text parser
2. Search for: **"router"**
3. Click **"Flow Control"** → **"Router"**
4. Click **"Add route"**
5. Between the router and the route, click the **wrench icon** to add a filter
6. Click **"Set up a filter"**
7. Name it: `Not blacklisted`
8. Add condition:
   - **Field**: Click and select `{{5.$1}}` (the domain)
   - **Operator**: **"Text operators"** → **"Does not contain"**
   - **Value**: `eventbrite.com`
9. Click **"Add OR"** and repeat for:
   - `ticketmaster.com`
   - `facebook.com`
   - `meetup.com`
   - `timeout.com`
10. Click **"OK"**

### 9. Save Source to Database

1. After the filter/router, click **"+"**
2. Search: **"http"**
3. Click **"HTTP"** → **"Make a request"**
4. Fill in:
   - **URL**: `https://YOUR-PROJECT.supabase.co/rest/v1/rpc/upsert_source`
     - Replace `YOUR-PROJECT` with your actual Supabase URL
   - **Method**: **"POST"**

5. Under **"Headers"**, click **"Add item"** 4 times:
   - **Key**: `apikey` → **Value**: Your Supabase service_role key
   - **Key**: `Authorization` → **Value**: `Bearer YOUR_SERVICE_ROLE_KEY` (yes, put it again)
   - **Key**: `Content-Type` → **Value**: `application/json`
   - **Key**: `Prefer` → **Value**: `return=representation`

6. Under **"Body"**, paste this:
```json
{
  "p_domain": "{{5.$1}}",
  "p_event_id": "{{1.event_id}}"
}
```

7. Click **"OK"**

### 10. Check for Newsletters

1. Click **"+"** after the database save
2. Add a **"Filter"** (not router)
3. Name it: `New or unseen`
4. Condition:
   - `{{9.is_new}}` **equals** `true`
   - **OR**
   - `{{9.status}}` **equals** `unseen`
5. Click **"OK"**

### 11. Call Analyze Function

1. Click **"+"** after filter
2. **"HTTP"** → **"Make a request"**
3. Fill in:
   - **URL**: `https://YOUR-PROJECT.supabase.co/functions/v1/analyze-source`
   - **Method**: **"POST"**
   - **Headers**:
     - **Key**: `Authorization` → **Value**: `Bearer YOUR_SERVICE_ROLE_KEY`
     - **Key**: `Content-Type` → **Value**: `application/json`
   - **Body**:
```json
{
  "source_id": "{{9.id}}",
  "domain": "{{9.domain}}",
  "sample_url": "{{4.link}}"
}
```

4. Click **"OK"**

### 12. Save and Activate

1. Click **"Save"** button (bottom left or top right)
2. Give it a name: `NYC Events - Source Discovery`
3. Toggle the switch to **"ON"** (usually at the bottom)
4. You're done with Scenario 1! 🎉

---

# Scenario 2: Ingest Newsletter Emails

**What this does**: Watches your Gmail inbox and automatically saves any newsletter emails to your database.

## Visual Flow

```
New Email in Gmail → Extract Email Data → Save to Database
```

---

## Step-by-Step Setup

### 1. Create New Scenario

1. In Make.com, click **"Scenarios"** in left sidebar
2. Click **"Create a new scenario"**

### 2. Add Gmail Trigger

1. Click the **"+"** button
2. Search: **"gmail"**
3. Click **"Gmail"** → **"Watch emails"**
4. Click **"Create a connection"**
5. A popup will appear - click **"Sign in with Google"**
6. Log in with your **events Gmail account**
7. Click **"Allow"** to give Make.com access
8. Back in Make.com:
   - **Folder**: Select **"INBOX"** (or create a label for newsletters)
   - **Criteria**: Leave as default or select "All emails"
   - **Maximum number of results**: `10`
9. Click **"OK"**

### 3. Call Ingest Email Function

1. Click **"+"** after Gmail
2. Search: **"http"**
3. **"HTTP"** → **"Make a request"**
4. Fill in:
   - **URL**: `https://YOUR-PROJECT.supabase.co/functions/v1/ingest-email`
   - **Method**: **"POST"**
   - **Headers**:
     - **Key**: `Authorization` → **Value**: `Bearer YOUR_SERVICE_ROLE_KEY`
     - **Key**: `Content-Type` → **Value**: `application/json`
   - **Body**: Click the body field and carefully map these:

```json
{
  "raw_email_id": "{{1.id}}",
  "from_address": "{{1.from}}",
  "subject": "{{1.subject}}",
  "received_at": "{{formatDate(1.date; "YYYY-MM-DDTHH:mm:ssZ")}}",
  "html_body": "{{1.textHtml}}"
}
```

**How to map fields**:
- Click in the quotes after `"raw_email_id": "`
- You'll see a list of fields from Gmail
- Click `id`, and it will insert `{{1.id}}`
- Repeat for each field

5. Click **"OK"**

### 4. Save and Schedule

1. Click **"Save"** button
2. Name it: `NYC Events - Email Ingestion`
3. Click the **clock icon** at the bottom (Scheduling)
4. Set schedule:
   - **Run**: **"Every 15 minutes"** (or your preference)
   - Or choose **"Watch"** mode for instant (uses more operations)
5. Toggle to **"ON"**
6. Done! 🎉

---

## 🧪 Test Your Setup

### Test Scenario 1 (Source Discovery)

1. Go to Supabase → **SQL Editor**
2. Run this to create a test event:

```sql
INSERT INTO events (title, venue_name, neighborhood, start_time)
VALUES ('Brooklyn Film Festival', 'Nitehawk Cinema', 'Williamsburg', NOW() + INTERVAL '7 days')
RETURNING id;
```

3. Copy the `id` that's returned
4. In terminal or using a tool like Postman:

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/like-event \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_id": "PASTE_YOUR_EVENT_ID_HERE"
  }'
```

5. Go to Make.com → **Scenarios** → Click your scenario → **History**
6. You should see it ran! Click to see details
7. Go to Supabase → **Table Editor** → **sources** table
8. You should see new domains discovered!

### Test Scenario 2 (Email Ingestion)

1. Send a test email to your events Gmail inbox
2. Wait 15 minutes (or run scenario manually)
3. In Make.com → Check execution history
4. In Supabase → **Table Editor** → **ingested_emails**
5. You should see your test email!

**To run manually (don't wait 15 min)**:
1. In Make.com, click your scenario
2. Click **"Run once"** button (bottom right)

---

## ✅ You're Done!

Your system is now fully automated:
- ✅ When you like an event → automatically discovers sources
- ✅ When newsletters arrive → automatically saved to database
- ✅ Sources checked for newsletter signups
- ✅ Everything tracked in one place

---

## 🎯 What's Next?

### See Your Data

Go to Supabase → **Table Editor** and explore:
- **events** - Your events
- **sources** - Discovered newsletters (check `status = 'suggested'`)
- **ingested_emails** - Your newsletter emails

### Subscribe to Newsletters

1. Query suggested sources:
```sql
SELECT * FROM sources WHERE status = 'suggested' AND newsletter_signup_url IS NOT NULL;
```

2. Visit the `newsletter_signup_url` for each source
3. Subscribe with your events Gmail address
4. Update the source status:
```sql
UPDATE sources SET status = 'subscribed' WHERE id = 'PASTE_SOURCE_ID';
```

### Build a Frontend (Optional)

Now that the backend works, you can build a simple web app to:
- Browse events
- Click 👍 to like events (triggers discovery)
- See suggested newsletters
- Manage subscriptions

---

## 🆘 Troubleshooting

### "Make.com scenario isn't running"

1. Make sure it's toggled **ON** (green switch)
2. Check the **History** tab for errors
3. Click on a failed run to see the error message

### "No sources being discovered"

1. Check Make.com History - did the webhook receive data?
2. Check your Supabase environment variable is set correctly
3. Try running the scenario manually with "Run once"
4. Check that the filter isn't too strict (temporarily remove it to test)

### "Gmail not connecting"

1. Re-authorize Gmail connection in Make.com
2. Make sure you're using the correct Gmail account
3. Check that "Less secure apps" is enabled if needed

### "Supabase API errors"

1. Double-check your service_role key is correct
2. Make sure the URL includes `/rest/v1/rpc/` for the upsert function
3. Make sure the URL includes `/functions/v1/` for edge functions
4. Check headers are exactly as specified

---

## 📊 Monitor Your System

### Make.com Usage

- Free tier: 1,000 operations/month
- Each module = 1 operation
- Scenario 1: ~10-15 operations per liked event
- Scenario 2: 1 operation per email

### View Execution History

1. Make.com → **Scenarios**
2. Click your scenario
3. Click **"History"** tab
4. See all runs, successes, failures

### View Supabase Logs

1. Supabase → **Edge Functions**
2. Click a function
3. Click **"Logs"** tab
4. See all invocations and errors

---

## 🎉 Congratulations!

You now have a fully automated NYC events discovery system powered by newsletters!

Enjoy discovering cool events! 🗽✨
