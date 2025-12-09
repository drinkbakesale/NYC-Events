# 🧪 Testing Your Edge Functions

## Step 1: Get Your Anon Key

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon at bottom of sidebar)
4. Click **API**
5. Find **Project API keys**
6. Copy the **anon** **public** key (the one that says "anon" or "public")

It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...` (very long)

**Save this somewhere - you'll use it for all tests below.**

---

## Step 2: Test `like-event` Function

You already created a test event with ID: `eb4aa659-1f04-4611-a385-179a6e4cfd62`

Now let's test liking it:

### Option A: Using curl (in terminal)

```bash
curl -X POST https://initlnbtybyewyhjixkf.supabase.co/functions/v1/like-event \
  -H "Authorization: Bearer PASTE_YOUR_ANON_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_id": "eb4aa659-1f04-4611-a385-179a6e4cfd62"
  }'
```

**Replace `PASTE_YOUR_ANON_KEY_HERE` with your actual anon key!**

### Option B: Using Postman (if you prefer a GUI)

1. Open Postman or download it from https://postman.com
2. Create a new request:
   - **Method**: POST
   - **URL**: `https://initlnbtybyewyhjixkf.supabase.co/functions/v1/like-event`
   - **Headers** (click "Headers" tab):
     - Key: `Authorization` → Value: `Bearer YOUR_ANON_KEY`
     - Key: `Content-Type` → Value: `application/json`
   - **Body** (click "Body" tab → select "raw" → select "JSON"):
     ```json
     {
       "user_id": "550e8400-e29b-41d4-a716-446655440000",
       "event_id": "eb4aa659-1f04-4611-a385-179a6e4cfd62"
     }
     ```
3. Click **Send**

### What You Should See

**BEFORE Make.com setup**, you'll get an error like:
```json
{
  "status": "partial_success",
  "message": "Reaction saved but Make.com webhook failed"
}
```

**This is EXPECTED!** It means:
- ✅ The function works
- ✅ Your reaction was saved to the database
- ❌ Make.com webhook isn't set up yet (we'll do that next)

---

## Step 3: Verify the Reaction Was Saved

Go to Supabase → **Table Editor** → **user_event_reactions** table

You should see a new row with:
- `event_id`: eb4aa659-1f04-4611-a385-179a6e4cfd62
- `reaction`: like
- `user_id`: 550e8400-e29b-41d4-a716-446655440000

**If you see this row, your function works! ✅**

---

## Step 4: Test `ingest-email` Function

This one is simpler to test:

```bash
curl -X POST https://initlnbtybyewyhjixkf.supabase.co/functions/v1/ingest-email \
  -H "Authorization: Bearer PASTE_YOUR_ANON_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_email_id": "test-email-12345",
    "from_address": "hello@brooklynbased.com",
    "subject": "This Week in Brooklyn Events",
    "received_at": "2025-01-15T12:00:00Z",
    "html_body": "<html><body>Test newsletter content</body></html>"
  }'
```

### What You Should See

```json
{
  "status": "ok",
  "message": "Email ingested successfully",
  "ingested_email_id": "some-uuid",
  "source_id": null,
  "domain": "brooklynbased.com"
}
```

Note: `source_id` will be null because we haven't created a source for brooklynbased.com yet. That's fine!

---

## Step 5: Verify the Email Was Saved

Go to Supabase → **Table Editor** → **ingested_emails** table

You should see a new row with:
- `raw_email_id`: test-email-12345
- `from_address`: hello@brooklynbased.com
- `subject`: This Week in Brooklyn Events

**If you see this, the function works! ✅**

---

## Step 6: Test `analyze-source` Function

First, create a test source:

```sql
-- Run this in Supabase SQL Editor
INSERT INTO sources (domain, status)
VALUES ('brooklynbased.com', 'unseen')
RETURNING id;
```

Copy the ID that's returned, then:

```bash
curl -X POST https://initlnbtybyewyhjixkf.supabase.co/functions/v1/analyze-source \
  -H "Authorization: Bearer PASTE_YOUR_ANON_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "PASTE_SOURCE_ID_HERE",
    "domain": "brooklynbased.com",
    "sample_url": "https://brooklynbased.com/events/"
  }'
```

### What You Should See

```json
{
  "status": "ok",
  "source_id": "your-source-id",
  "domain": "brooklynbased.com",
  "analysis": {
    "is_events_site": true,
    "candidate_type": "editorial_events_site",
    "newsletter_signup_url": "https://brooklynbased.com/newsletter",
    "confidence": 0.75
  }
}
```

The actual results will vary based on what the function finds on the website.

---

## ✅ Testing Checklist

- [ ] Got anon key from Supabase settings
- [ ] Tested `like-event` - saw reaction saved in database
- [ ] Tested `ingest-email` - saw email saved in database
- [ ] Tested `analyze-source` - saw source analyzed

---

## 🔑 Key Concept: Where Keys Go

**In the Edge Function code** (already done, don't change):
```typescript
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```
These environment variables are **automatically available** to your functions. You don't need to add them.

**When CALLING the function** (you do this):
```bash
-H "Authorization: Bearer YOUR_ANON_KEY"
```
This is how you authenticate YOUR request to call the function.

---

## Common Errors

### Error: "Invalid API key"
- You forgot to include the `Authorization` header
- Or you're using the wrong key
- Make sure it starts with `Bearer ` (with a space after)

### Error: "Missing auth header"
- You forgot the `-H "Authorization: Bearer ..."` part

### Error: "Function not found"
- Check the function name in the URL
- It should be `like-event`, `analyze-source`, or `ingest-email`
- Not `quick-action`

### Error: "Make.com webhook failed"
- This is expected before Make.com setup
- As long as you see `"partial_success"` and the data is in the database, you're good!

---

## Next Step

Once all three functions pass these tests, you're ready to set up Make.com!

Continue to: **[docs/MAKE_SETUP_SIMPLE.md](MAKE_SETUP_SIMPLE.md)**
