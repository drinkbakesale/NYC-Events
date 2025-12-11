# 🚀 Deploy Your NYC Events Frontend

Your mobile-friendly frontend is ready! Follow these steps to get it live.

---

## 📋 Prerequisites Checklist

Before deploying, make sure you have:

- [ ] Applied all Supabase migrations (especially migration 013)
- [ ] Deployed the `dislike-event` edge function to Supabase
- [ ] Your Supabase URL and anon key ready
- [ ] A UUID for your user ID

---

## Step 1: Apply Database Migration ✅

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Add hidden column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Create index for hidden events
CREATE INDEX IF NOT EXISTS idx_events_hidden ON events(hidden) WHERE hidden = FALSE;

-- Update constraint to allow dislike
ALTER TABLE user_event_reactions DROP CONSTRAINT IF EXISTS user_event_reactions_reaction_check;
ALTER TABLE user_event_reactions ADD CONSTRAINT user_event_reactions_reaction_check
  CHECK (reaction IN ('like', 'dislike'));

-- Create view for sources to unsubscribe (sources with 5+ dislikes)
CREATE OR REPLACE VIEW sources_to_unsubscribe AS
SELECT
  s.id,
  s.domain,
  s.display_name,
  s.status,
  s.newsletter_signup_url,
  COUNT(DISTINCT uer.event_id) as dislike_count
FROM sources s
INNER JOIN events e ON e.source_id = s.id
INNER JOIN user_event_reactions uer ON uer.event_id = e.id AND uer.reaction = 'dislike'
WHERE s.status = 'subscribed'
GROUP BY s.id, s.domain, s.display_name, s.status, s.newsletter_signup_url
HAVING COUNT(DISTINCT uer.event_id) >= 5;

-- Grant permissions on view
GRANT SELECT ON sources_to_unsubscribe TO authenticated, anon, service_role;

-- Function to count dislikes for a source
CREATE OR REPLACE FUNCTION get_source_dislike_count(p_source_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT uer.event_id)::INTEGER
  FROM user_event_reactions uer
  INNER JOIN events e ON e.id = uer.event_id
  WHERE e.source_id = p_source_id
    AND uer.reaction = 'dislike';
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION get_source_dislike_count TO authenticated, anon, service_role;
```

Click **Run**. You should see "Success. No rows returned."

---

## Step 2: Deploy Dislike Edge Function 🔧

In your terminal, from the project root:

```bash
# Make sure you're logged in to Supabase
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the dislike-event function
supabase functions deploy dislike-event
```

Verify it's deployed:
- Go to **Supabase Dashboard** → **Edge Functions**
- You should see `dislike-event` listed

---

## Step 3: Get Your Credentials 🔑

### A. Supabase URL and Key

1. Go to your **Supabase Dashboard**
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (the long string)

### B. Generate User ID

1. Visit [uuidgenerator.net](https://www.uuidgenerator.net/)
2. Copy a UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
3. Save it - this will be your user ID

---

## Step 4: Test Locally (Optional but Recommended) 💻

```bash
cd frontend
npm install

# Create .env.local
cp .env.local.example .env.local

# Edit .env.local and add your credentials
nano .env.local
```

Your `.env.local` should look like:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_USER_ID=550e8400-e29b-41d4-a716-446655440000
```

Run the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and test:
- [ ] Events load
- [ ] Date range filters work
- [ ] Like button works (check Supabase table)
- [ ] Dislike button hides event
- [ ] Navigation between tabs works

---

## Step 5: Deploy to Vercel 🌐

### Method 1: Via Vercel Dashboard (Easiest)

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready to deploy"
   git push
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

3. **Click "Add New Project"**

4. **Import your repository**: `NYC-Events`

5. **Configure the project**:
   - **Framework Preset**: Next.js ✅ (should auto-detect)
   - **Root Directory**: Click **Edit** → Enter `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

6. **Add Environment Variables**:

   Click **"Environment Variables"** and add these 3:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` (your anon key) |
   | `NEXT_PUBLIC_USER_ID` | `550e8400-...` (your UUID) |

7. **Click "Deploy"** 🚀

   Wait 2-3 minutes. Vercel will:
   - Install dependencies
   - Build your app
   - Deploy to a public URL

8. **Visit your app!** 🎉

   You'll get a URL like: `https://nyc-events-finder-xxxx.vercel.app`

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow the prompts:
# ? Set up and deploy? Yes
# ? Which scope? (select your account)
# ? Link to existing project? No
# ? What's your project's name? nyc-events-finder
# ? In which directory is your code located? ./

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your anon key when prompted

vercel env add NEXT_PUBLIC_USER_ID
# Paste your UUID when prompted

# Deploy to production
vercel --prod
```

---

## Step 6: Verify Deployment ✅

Visit your Vercel URL and test:

### Main Events View
- [ ] Events load in calendar format
- [ ] Date range buttons work (Next 7 days, Next 14 days, This week)
- [ ] Custom date range works
- [ ] Tapping event expands accordion with full details
- [ ] Like button works (👍 icon turns black)
- [ ] Dislike button hides event (after confirmation)

### Liked Events Tab
- [ ] Shows liked events
- [ ] Only shows upcoming events
- [ ] Links work

### Suggested Sources Tab
- [ ] Shows discovered sources
- [ ] Subscribe links open in new tab
- [ ] "✓ Subscribed" button removes source from list
- [ ] "✕ Dismiss" button removes source from list

### Sources to Unsubscribe Tab
- [ ] Empty by default (normal)
- [ ] After disliking 5 events from a source, it appears here

---

## 🎨 Customization

### Change Dislike Threshold

Default is 5 dislikes. To change to 3:

1. Edit `supabase/migrations/013_add_dislike_functionality.sql`:
   ```sql
   HAVING COUNT(DISTINCT uer.event_id) >= 3  -- Change from 5 to 3
   ```

2. Re-run the migration in Supabase SQL Editor

### Add More Date Presets

Edit `frontend/components/DateRangeSelector.tsx` and add new buttons.

### Change Theme

Edit `frontend/app/globals.css` for dark mode or colors.

---

## 🐛 Troubleshooting

### "Events not loading"

**Check:**
1. Environment variables are set correctly in Vercel
2. RLS policies allow anon access (run migration 009)
3. Browser console for errors

**Fix:** Go to Vercel Dashboard → Your Project → Settings → Environment Variables

### "Like/Dislike not working"

**Check:**
1. Edge functions are deployed: Supabase Dashboard → Edge Functions
2. Function logs: Click on function → Logs tab
3. `USER_ID` environment variable is a valid UUID

**Fix:** Redeploy functions:
```bash
supabase functions deploy like-event
supabase functions deploy dislike-event
```

### "Sources to Unsubscribe always empty"

This is **normal** if you haven't disliked 5+ events from any single source yet.

To test:
1. Find 5 events from the same source
2. Dislike all 5
3. Go to "Sources to Unsubscribe" tab
4. The source should appear

### Build fails on Vercel

**Error: "Cannot find module '@/lib/supabase'"**

**Fix:** Make sure **Root Directory** is set to `frontend` in Vercel project settings.

**Error: "Environment variable NEXT_PUBLIC_SUPABASE_URL is not defined"**

**Fix:** Add all 3 environment variables in Vercel Dashboard.

---

## 📱 Mobile Testing

Test on your phone:

1. Open the Vercel URL on your mobile browser
2. Should see bottom navigation bar
3. Tap to switch between tabs
4. Scroll events smoothly
5. Tap events to expand/collapse
6. Buttons should be easy to tap (36px minimum)

---

## 🎉 You're Done!

Your NYC Events Finder is now live! Share the URL with yourself and start using it.

### Next Steps

1. **Add some events** via Make.com
2. **Like events** to discover sources
3. **Subscribe to suggested newsletters**
4. **Dislike unwanted events**
5. **Check back daily** for new events from your subscribed sources

---

## 📧 Keep in Mind

- This is a **single-user app** (no authentication needed)
- Your `USER_ID` is hardcoded in environment variables
- All data is stored in your Supabase database
- The app is completely free to host on Vercel (up to reasonable traffic)

Enjoy finding awesome NYC events! 🗽✨
