# NYC Events Finder - Frontend

A mobile-friendly web interface for browsing and managing NYC events from your newsletters.

## Features

- 📅 **Events Calendar** - Browse events by date range (next 7 days, 14 days, this week, or custom)
- 👍 **Like/Dislike** - Like events to discover sources, dislike to hide them
- 📰 **Suggested Sources** - View and subscribe to suggested newsletter sources
- ⭐ **Liked Events** - Track your favorite upcoming events
- 🚫 **Unsubscribe Manager** - See sources with too many dislikes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase
- **Styling**: Pure CSS (Black & White, Mobile-First)
- **Deployment**: Vercel

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase project set up with migrations applied
- Supabase Edge Functions deployed (`like-event`, `dislike-event`)

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
# Copy the example
cp .env.local.example .env.local
```

Then edit `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_USER_ID=your-uuid-here
```

**To get your Supabase credentials:**
1. Go to your Supabase Dashboard
2. Click **Settings** → **API**
3. Copy the **Project URL** and **anon public** key

**To generate a user ID:**
1. Visit [uuidgenerator.net](https://www.uuidgenerator.net/)
2. Copy a UUID v4
3. Paste it as `NEXT_PUBLIC_USER_ID`

### 4. Apply Database Migrations

Make sure you've applied these migrations in Supabase SQL Editor:

```sql
-- Run these in order:
-- 001_initial_schema.sql
-- 002_rls_policies.sql
-- 003_helper_functions.sql
-- ... (all migrations up to)
-- 013_add_dislike_functionality.sql
```

The dislike functionality requires:
- `hidden` column on `events` table
- `sources_to_unsubscribe` view
- `get_source_dislike_count` function

### 5. Deploy Edge Functions

Deploy the required edge functions to Supabase:

```bash
# Deploy like-event function
supabase functions deploy like-event

# Deploy dislike-event function
supabase functions deploy dislike-event
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add frontend"
   git push
   ```

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click **"Add New Project"**

4. Import your GitHub repository

5. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

6. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_USER_ID`

7. Click **"Deploy"**

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name: nyc-events-finder
# - Directory: ./
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_USER_ID

# Deploy to production
vercel --prod
```

## Usage

### Main Events View

- **Date Range**: Select preset ranges or use custom dates
- **Event Cards**: Tap to expand and see full details
- **Like (👍)**: Saves event and triggers source discovery
- **Dislike (👎)**: Hides event globally (confirmation required)

### Liked Events

- View all upcoming events you've liked
- Click links to visit event pages

### Suggested Sources

- Sources discovered from liked events
- Click "Subscribe" links to sign up for newsletters
- Click "✓ Subscribed" when you've subscribed
- Click "✕ Dismiss" to hide sources you're not interested in

### Sources to Unsubscribe

- Shows sources with 5+ dislikes
- Visit the links to unsubscribe from those newsletters
- Click "✕ Keep" if you change your mind

## Troubleshooting

### Events not loading

1. Check your `.env.local` file has correct Supabase credentials
2. Verify RLS policies allow anonymous access:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```
3. Check browser console for errors

### Like/Dislike not working

1. Verify edge functions are deployed:
   ```bash
   supabase functions list
   ```
2. Check function logs in Supabase Dashboard → Edge Functions
3. Make sure `USER_ID` in `.env.local` is a valid UUID

### "Sources to Unsubscribe" empty

This is normal if you haven't disliked 5+ events from any source yet.

### Build errors on Vercel

1. Make sure `Root Directory` is set to `frontend`
2. Check all environment variables are set
3. View build logs for specific errors

## Customization

### Change Theme Colors

Edit `app/globals.css`:

```css
/* Change to dark mode */
body {
  background-color: #000000;
  color: #ffffff;
}

.event-card {
  border: 1px solid #ffffff;
}
```

### Change Dislike Threshold

The default is 5 dislikes to trigger "sources to unsubscribe". To change:

Edit `supabase/migrations/013_add_dislike_functionality.sql`:

```sql
HAVING COUNT(DISTINCT uer.event_id) >= 3  -- Change 5 to 3
```

Then re-run the migration.

### Add More Date Ranges

Edit `components/DateRangeSelector.tsx` and add new preset buttons.

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx                # Main events calendar
│   ├── globals.css             # Global styles
│   ├── liked-events/
│   │   └── page.tsx            # Liked events page
│   ├── suggested-sources/
│   │   └── page.tsx            # Suggested sources page
│   └── unsubscribe/
│       └── page.tsx            # Sources to unsubscribe page
├── components/
│   ├── Navigation.tsx          # Bottom navigation bar
│   ├── EventCard.tsx           # Event card with accordion
│   └── DateRangeSelector.tsx   # Date range filter
├── lib/
│   └── supabase.ts             # Supabase client & types
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.local                  # Environment variables (not committed)
```

## Contributing

This is a personal project. Feel free to fork and modify for your own use!

## License

MIT
