# 🚀 Quick Start - Get Running in 30 Minutes

This is the simplest possible guide to get your NYC Events Finder running.

---

## Part 1: Supabase Setup (10 minutes)

### Step 1: Create a Supabase Project

1. Go to **https://supabase.com** and sign up (it's free)
2. Click the **"New Project"** button
3. Fill in:
   - **Name**: `nyc-events`
   - **Database Password**: Click "Generate a password" and **SAVE IT SOMEWHERE**
   - **Region**: Choose the closest to you (e.g., `US East`)
4. Click **"Create new project"**
5. Wait 2 minutes while it sets up

### Step 2: Run the SQL Migrations

This creates all your database tables.

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** button (top right)
3. Open the file `supabase/migrations/001_initial_schema.sql` in this repo
4. **Copy ALL the text** from that file
5. **Paste it** into the Supabase SQL Editor
6. Click **"Run"** button (bottom right)
7. You should see ✅ **"Success. No rows returned"**

**Repeat for the other 2 migrations:**

8. Click **"New query"** again
9. Open `supabase/migrations/002_rls_policies.sql`
10. Copy all → Paste → Run
11. Should see ✅ Success

12. Click **"New query"** again
13. Open `supabase/migrations/003_helper_functions.sql`
14. Copy all → Paste → Run
15. Should see ✅ Success

**Verify it worked:**
- Click **"Table Editor"** in the left sidebar
- You should see 6 tables: `events`, `sources`, `user_event_reactions`, `source_discoveries`, `newsletter_subscriptions`, `ingested_emails`

### Step 3: Get Your API Keys

You'll need these for later steps.

1. Click **"Settings"** (bottom of left sidebar)
2. Click **"API"**
3. Copy and save these somewhere (like a text file):

```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbG... (long string)
service_role key: eyJhbG... (long string) ⚠️ KEEP THIS SECRET!
```

---

## Part 2: Deploy Edge Functions (10 minutes)

You have **2 options**: Easy web-based (Option A) or Terminal/CLI (Option B).

### OPTION A: Web-Based (No Terminal Required) ⭐ EASIEST

1. In Supabase dashboard, click **"Edge Functions"** in left sidebar
2. Click **"Create a new function"** button

#### Deploy Function 1: like-event

1. **Function name**: `like-event`
2. Click the **code editor** area
3. Delete everything in the editor
4. Open the file `supabase/functions/like-event/index.ts` from this repo
5. **Copy ALL the code** from that file
6. **Paste** it into the Supabase code editor
7. Click **"Deploy function"** button
8. Wait 10-20 seconds for deployment

#### Deploy Function 2: analyze-source

1. Click **"Create a new function"** again
2. **Function name**: `analyze-source`
3. Delete everything in editor
4. Open `supabase/functions/analyze-source/index.ts`
5. Copy all → Paste
6. Click **"Deploy function"**
7. Wait for deployment

#### Deploy Function 3: ingest-email

1. Click **"Create a new function"** again
2. **Function name**: `ingest-email`
3. Delete everything in editor
4. Open `supabase/functions/ingest-email/index.ts`
5. Copy all → Paste
6. Click **"Deploy function"**
7. Wait for deployment

**Verify it worked:**
- You should see all 3 functions listed in Edge Functions section
- Each should show status: "Active" or "Deployed"

---

### OPTION B: Terminal/CLI (Faster if you're comfortable with terminal)

**Prerequisites**: You need Node.js installed. Check by running:
```bash
node --version
```

If you don't have it, download from: https://nodejs.org

**Steps:**

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login

# This will open your browser - click "Authorize"

# 3. Link to your project
supabase link

# You'll be asked:
# - Select your organization
# - Select your project (nyc-events)
# - Enter your database password (from Step 1)

# 4. Deploy all functions at once
cd /home/user/NYC-Events
supabase functions deploy like-event
supabase functions deploy analyze-source
supabase functions deploy ingest-email

# You should see success messages for each
```

**Verify:**
```bash
supabase functions list
```

Should show all 3 functions.

---

## Part 3: Get Search API Key (5 minutes)

You need this to search the web for event sources.

### Google Custom Search (RECOMMENDED - Free)

1. Go to **https://console.cloud.google.com**
2. Create a new project (or select existing)
3. Click **"APIs & Services"** → **"Library"**
4. Search for **"Custom Search API"**
5. Click it → Click **"Enable"**
6. Go to **"APIs & Services"** → **"Credentials"**
7. Click **"Create Credentials"** → **"API Key"**
8. **Copy the API key** and save it

**Create Search Engine:**

1. Go to **https://programmablesearchengine.google.com**
2. Click **"Add"** or **"Get started"**
3. **Sites to search**: Enter `www.google.com`
4. **Name**: `NYC Events Finder`
5. Click **"Create"**
6. Click **"Customize"** → Turn ON **"Search the entire web"**
7. Copy the **Search Engine ID** (looks like `012345...abcdef`)

**Save both:**
```
Google API Key: AIzaSy...
Search Engine ID: 012345...abcdef
```

---

## Part 4: Make.com Account (2 minutes)

1. Go to **https://make.com** and sign up (free tier is fine)
2. Verify your email
3. You're done! (We'll set up scenarios next)

---

## Part 5: Gmail Account (2 minutes)

1. Create a NEW Gmail account at **https://gmail.com**
   - Example: `nyc-events-yourname@gmail.com`
   - This will be dedicated to receiving event newsletters
2. **Save the email and password**
3. Done!

---

## ✅ What You've Accomplished

You now have:
- ✅ Supabase project with database tables
- ✅ 3 Edge Functions deployed
- ✅ Search API configured
- ✅ Make.com account ready
- ✅ Dedicated Gmail inbox

---

## 🎯 Next Step: Connect Everything with Make.com

Now that everything is set up, you need to connect these pieces together using Make.com.

I'll create a separate visual guide for that next. But first, let's test what you have!

---

## 🧪 Quick Test

Let's make sure everything works:

### Test 1: Database

1. Go to Supabase → **SQL Editor** → **New query**
2. Paste this:

```sql
-- Create a test event
INSERT INTO events (title, venue_name, neighborhood, start_time)
VALUES ('Test Concert', 'Brooklyn Steel', 'Williamsburg', NOW() + INTERVAL '7 days')
RETURNING *;
```

3. Click **Run**
4. You should see the event data returned!

### Test 2: Edge Function

1. Go to Supabase → **Edge Functions** → Click **like-event**
2. Look for the URL (something like `https://xxxxx.supabase.co/functions/v1/like-event`)
3. Keep this page open - we'll test it later after Make.com setup

---

## 📋 Checklist Before Moving Forward

- [ ] Supabase project created
- [ ] 6 database tables exist (check in Table Editor)
- [ ] 3 Edge Functions deployed (check in Edge Functions section)
- [ ] API keys saved somewhere safe
- [ ] Google Search API + Search Engine ID ready
- [ ] Make.com account created
- [ ] Dedicated Gmail account created

Once you have all these checkboxes ✅, you're ready for the Make.com setup!

---

## Need Help?

**Common Issues:**

**"SQL migration failed"**
- Make sure you copied the ENTIRE file
- Make sure you ran them in order (001, 002, 003)
- Try refreshing the page and running again

**"Edge Function won't deploy"**
- Make sure you copied the ENTIRE file including the imports at the top
- Check that the function name matches exactly: `like-event`, `analyze-source`, `ingest-email` (with hyphens, not underscores)

**"Can't find SQL Editor"**
- It's in the left sidebar of Supabase dashboard
- Look for an icon that looks like `</>`

**"Can't find Edge Functions"**
- It's in the left sidebar, icon looks like `⚡` or `λ`
- If you don't see it, your project might still be setting up - wait a few minutes
