# 🚀 START HERE - Your NYC Events Finder Setup

Welcome! This system will help you discover amazing NYC events through newsletters.

---

## 📖 How to Use This Guide

Follow these documents **in order**:

### 1️⃣ **QUICK_START.md** (30 minutes)
**📍 Location**: `docs/QUICK_START.md`

**What you'll do**:
- Create Supabase account and project
- Run 3 SQL files to create your database
- Deploy 3 Edge Functions (just copy & paste code)
- Get Google Search API key
- Create Make.com and Gmail accounts

**Start with this file!** Everything is explained step-by-step.

### 2️⃣ **MAKE_SETUP_SIMPLE.md** (30 minutes)
**📍 Location**: `docs/MAKE_SETUP_SIMPLE.md`

**What you'll do**:
- Create 2 Make.com scenarios (automated workflows)
- Connect everything together
- Test that it all works

**Do this second!** Includes screenshots descriptions and troubleshooting.

---

## 🎯 What This System Does

```
┌─────────────────────────────────────────────────────────────┐
│  YOU: Like an event in your app                             │
│    👍 "Brooklyn Film Festival looks cool!"                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Automatically searches Google                      │
│    🔍 "Brooklyn Film Festival Nitehawk Cinema NYC"          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Finds websites that mentioned the event            │
│    📰 brooklynbased.com                                     │
│    📰 weirdbrooklyn.substack.com                           │
│    📰 nitehawkcinema.com                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Checks each site for newsletter signup            │
│    ✅ brooklynbased.com → Found newsletter!                 │
│    ✅ weirdbrooklyn.substack.com → Substack detected!      │
│    ❌ nitehawkcinema.com → No newsletter found             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  YOU: See suggested newsletters in your dashboard           │
│    📧 Brooklyn Based - Subscribe?                           │
│    📧 Weird Brooklyn - Subscribe?                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  YOU: Subscribe to the ones you like                        │
│    ✅ Subscribed with nyc-events@gmail.com                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Watches your Gmail inbox                           │
│    📬 New email from Brooklyn Based!                        │
│    💾 Automatically saved to database                       │
│    🎭 (Future) Extracts events from email                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Links to Files You'll Need

### SQL Files (for Supabase)
Copy and paste these into Supabase SQL Editor:
- `supabase/migrations/001_initial_schema.sql` - Creates tables
- `supabase/migrations/002_rls_policies.sql` - Security rules
- `supabase/migrations/003_helper_functions.sql` - Helper functions

### Edge Functions (for Supabase)
Copy and paste these into Supabase Edge Functions:
- `supabase/functions/like-event/index.ts` - Handles likes
- `supabase/functions/analyze-source/index.ts` - Checks for newsletters
- `supabase/functions/ingest-email/index.ts` - Saves emails

### Guides
- `docs/QUICK_START.md` - **START HERE** ⭐
- `docs/MAKE_SETUP_SIMPLE.md` - Do this second
- `docs/setup-guide.md` - Detailed version (if you want more info)
- `docs/make-scenarios.md` - Technical details (advanced)

---

## 🔑 What You'll Need

Create accounts for these (all have free tiers):

1. **Supabase** (database + backend)
   - Sign up: https://supabase.com
   - Free tier: ✅ Perfect for this project

2. **Make.com** (automation)
   - Sign up: https://make.com
   - Free tier: ✅ 1,000 operations/month

3. **Google Cloud** (for search API)
   - Sign up: https://console.cloud.google.com
   - Free tier: ✅ 100 searches/day

4. **Gmail** (dedicated inbox)
   - Create new account: https://gmail.com
   - 100% free: ✅

**Total cost**: $0/month to start! 🎉

---

## ⏱️ Time Estimate

- **Database setup**: 10 minutes
- **Edge Functions**: 10 minutes
- **Search API**: 5 minutes
- **Make.com scenarios**: 30 minutes
- **Testing**: 10 minutes

**Total**: ~1 hour to get fully running

---

## 🆘 Need Help?

### While Following Guides

Each guide has a **"Troubleshooting"** section at the bottom. Check there first!

### Common Issues

**"I can't find the SQL Editor in Supabase"**
- Look in the left sidebar for an icon like `</>`

**"My Edge Function won't deploy"**
- Make sure you copied the ENTIRE file
- Check the function name is exact: `like-event` not `like_event`

**"Make.com scenario shows errors"**
- Click the red error to see details
- Most common: Wrong API key or URL
- Check the troubleshooting section in MAKE_SETUP_SIMPLE.md

**"Nothing is happening when I test"**
- Check Make.com scenario history (click History tab)
- Check Supabase Edge Function logs (click Logs tab)
- Make sure scenario is toggled ON (green switch)

### Additional Documentation

- **`README.md`** - Overview and architecture
- **`docs/setup-guide.md`** - Detailed setup guide
- **`docs/make-scenarios.md`** - Technical Make.com details

---

## ✅ Checklist

Print this or keep it open:

### Phase 1: Supabase
- [ ] Created Supabase account
- [ ] Created project
- [ ] Ran 001_initial_schema.sql
- [ ] Ran 002_rls_policies.sql
- [ ] Ran 003_helper_functions.sql
- [ ] Deployed like-event function
- [ ] Deployed analyze-source function
- [ ] Deployed ingest-email function
- [ ] Saved API keys somewhere safe

### Phase 2: External Services
- [ ] Got Google Search API key
- [ ] Got Google Search Engine ID
- [ ] Created Make.com account
- [ ] Created dedicated Gmail account

### Phase 3: Make.com
- [ ] Created Scenario 1 (Source Discovery)
- [ ] Added webhook URL to Supabase
- [ ] Created Scenario 2 (Email Ingestion)
- [ ] Connected Gmail to Make.com
- [ ] Both scenarios toggled ON

### Phase 4: Testing
- [ ] Created test event in database
- [ ] Tested like-event function
- [ ] Saw sources appear in database
- [ ] Sent test email to Gmail
- [ ] Saw email in ingested_emails table

---

## 🎯 After Setup

Once everything works:

### 1. Start Discovering Sources
- Create some events in your database (or wait for newsletters)
- Like events you're interested in
- Check the `sources` table for discovered sites

### 2. Subscribe to Newsletters
```sql
-- See suggested newsletters
SELECT * FROM sources
WHERE status = 'suggested'
AND newsletter_signup_url IS NOT NULL;
```
- Visit each newsletter_signup_url
- Subscribe with your events Gmail
- Update status to 'subscribed'

### 3. Monitor Ingestion
- Newsletters will arrive in your Gmail
- Make.com will auto-save them every 15 minutes
- Check `ingested_emails` table to see them

### 4. Build a Frontend (Optional)
The backend is complete! If you want a nice UI:
- Use Next.js + Supabase Auth
- Display events with 👍/👎 buttons
- Show suggested newsletters
- Manage subscriptions

---

## 🎉 Ready? Let's Go!

**👉 Open `docs/QUICK_START.md` and start there!**

You're about to build something really cool. Take it step by step, and you'll have your own personal NYC events discovery system running in about an hour.

Good luck! 🗽✨

---

## 📞 Questions?

If you get stuck:
1. Check the troubleshooting section in each guide
2. Review the detailed docs in `docs/setup-guide.md`
3. Double-check all API keys and URLs are correct
4. Make sure scenarios are toggled ON in Make.com

The documentation is thorough - the answer is likely in there! 📚
