# 🔗 Make.com Setup - Start Here

We need to create **2 scenarios** (automated workflows) in Make.com.

Let's start with **Scenario 1** because we need to get a webhook URL from it.

---

## Before You Start

Have these ready:
- ✅ Your Supabase Project URL: `https://initlnbtybyewyhjixkf.supabase.co`
- ✅ Your Supabase **service_role** key (get it from Settings → API → service_role)
- ✅ Your Google Search API key + Search Engine ID (from QUICK_START guide)

---

# Part 1: Create Scenario 1 - Source Discovery

## Step 1: Create Webhook

1. Go to **https://make.com** and log in
2. Click **"Create a new scenario"**
3. Click the **"+"** button in the center
4. Search for: **"webhook"**
5. Click **"Webhooks"**
6. Click **"Custom webhook"**
7. Click **"Add"** to create a new webhook
8. Name it: `like-event-trigger`
9. **🚨 IMPORTANT:** You'll see a webhook URL appear - **COPY THIS URL!**
   - It looks like: `https://hook.make.com/abc123xyz...`
   - **Keep this tab open or save it somewhere!**

---

## Step 2: Add Webhook URL to Supabase

Now we need to tell your `like-event` function about this webhook.

1. Go to **Supabase Dashboard**
2. Click **Edge Functions** in sidebar
3. Click your **"like-event"** function
4. Look for **"Environment variables"** or **"Secrets"** section
   - (Might be in Settings tab or a gear icon)
5. Click **"Add secret"** or **"Add new secret"**
6. Fill in:
   - **Name:** `MAKE_WEBHOOK_URL_LIKE_EVENT`
   - **Value:** Paste the webhook URL from Step 1
7. Click **"Save"** or **"Add"**

**✅ Important:** You might need to re-deploy the function after adding the secret. If there's a "Deploy" button, click it.

---

## Step 3: Test the Webhook Connection

Let's make sure the webhook is connected properly.

**In your terminal, run:**

```bash
curl -X POST https://initlnbtybyewyhjixkf.supabase.co/functions/v1/like-event \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_id": "eb4aa659-1f04-4611-a385-179a6e4cfd62"
  }'
```

**Now check Make.com:**

1. Go back to your Make.com scenario
2. You should see a message like **"Successfully determined"** or data should appear
3. If you see the event data (title, venue_name, search_queries), **YOU'RE GOLDEN!** ✅

**If nothing appears in Make.com:**
- Go to Supabase → Edge Functions → like-event → Logs tab
- Check for errors about the webhook URL
- Make sure you saved the environment variable correctly
- Try re-deploying the function

---

## What You Have So Far

At this point:
- ✅ Make.com webhook created
- ✅ Webhook URL added to Supabase
- ✅ Test showed data flowing from Supabase to Make.com

**This is the critical connection!** Everything else builds on this.

---

## Next: Build the Rest of Scenario 1

Now we'll add modules to:
1. Loop through search queries
2. Call Google Search API
3. Extract domains
4. Save to Supabase
5. Trigger analyze-source

**Continue to:** [SCENARIO_1_COMPLETE.md](SCENARIO_1_COMPLETE.md)

Or if you're comfortable, follow the full guide: [MAKE_SETUP_SIMPLE.md](MAKE_SETUP_SIMPLE.md)

---

## Quick Checklist

- [ ] Created Make.com scenario
- [ ] Added webhook module
- [ ] Copied webhook URL
- [ ] Added webhook URL to Supabase as `MAKE_WEBHOOK_URL_LIKE_EVENT`
- [ ] Re-deployed like-event function (if needed)
- [ ] Tested with curl command
- [ ] Saw data appear in Make.com

**Once you have all checkboxes ✅, you're ready to continue building the scenario!**

---

## Troubleshooting

**"I don't see data in Make.com after testing"**

1. Check Supabase Edge Functions → like-event → Logs
   - Look for errors about MAKE_WEBHOOK_URL_LIKE_EVENT
   - If you see "not configured", the env var isn't set correctly

2. Make sure the environment variable name is EXACT:
   - ✅ `MAKE_WEBHOOK_URL_LIKE_EVENT`
   - ❌ `MAKE_WEBHOOK_URL` (missing suffix)
   - ❌ `make_webhook_url_like_event` (wrong case)

3. Re-deploy the function after adding the secret

**"Where do I find the environment variables section?"**

Different Supabase UI versions:
- Look for "Secrets" tab when viewing the function
- Or "Settings" → "Secrets"
- Or a gear icon ⚙️ near the function name
- Or "Environment variables" in the function details

**"The webhook URL keeps changing"**

- Don't delete and recreate the webhook in Make.com
- Once created, the URL stays the same
- If you accidentally deleted it, create a new one and update Supabase
