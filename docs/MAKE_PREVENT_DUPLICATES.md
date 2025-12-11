# Preventing Duplicates in Make.com Scenarios

## Problem

You're seeing two issues:
1. **Duplicate Events**: The same event can be inserted multiple times
2. **Already Ingested Emails**: Make.com continues processing even when an email is already ingested

---

## Solution 1: Prevent Duplicate Events (Database Level)

### Apply the Database Migration

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Prevent duplicate events from being inserted
-- This creates a unique constraint on combinations that should identify the same event

-- Option 1: Unique constraint on title + venue + start_time
-- This prevents exact duplicates (same event at same venue at same time)
CREATE UNIQUE INDEX idx_events_unique_title_venue_time
ON events (
  LOWER(TRIM(title)),
  LOWER(TRIM(COALESCE(venue_name, ''))),
  start_time
)
WHERE start_time IS NOT NULL;

-- Option 2: Unique constraint on source_event_url
-- This prevents inserting the same event URL multiple times
CREATE UNIQUE INDEX idx_events_unique_source_url
ON events (source_event_url)
WHERE source_event_url IS NOT NULL AND source_event_url != '';
```

### What This Does

After applying this migration:
- ✅ **Same title + venue + start_time** = Duplicate prevented
- ✅ **Same source_event_url** = Duplicate prevented
- ✅ First insert succeeds, subsequent inserts fail with error code `23505`

### Handling Duplicate Errors in Make.com

When a duplicate event is inserted, Supabase will return an error:
```json
{
  "code": "23505",
  "message": "duplicate key value violates unique constraint"
}
```

**Option A: Ignore the error** (recommended for bulk imports)
1. In your Make.com HTTP module (Insert Event)
2. Right-click on the module → **Error handler** → **Ignore**
3. This will skip duplicates and continue with the next event

**Option B: Filter out duplicates**
1. Add a filter after your Insert Event module
2. Check if the HTTP status code is `409` (conflict)
3. Route duplicates to a separate path (e.g., log them or skip)

---

## Solution 2: Stop Make.com When Email Already Ingested

### The Issue

When the `ingest-email` function finds an existing email, it returns:
```json
{
  "status": "already_exists",
  "message": "Email already ingested",
  "ingested_email_id": "..."
}
```

But Make.com continues processing and tries to parse/insert events anyway.

### The Fix: Add a Router with Filter

Here's how to modify your Make.com scenario:

```
Gmail → HTTP (Ingest Email) → ROUTER → [Filter: New Email] → Parse/Insert Events
                                     ↘ [Filter: Already Exists] → STOP
```

### Step-by-Step Instructions

#### 1. Add a Router After Ingest Email Module

1. Click the **"+"** button after your **HTTP - Ingest Email** module
2. Search for: **"router"**
3. Select **Flow Control** → **Router**
4. This creates a fork in your scenario

#### 2. Create Route 1: New Email (Continue Processing)

1. Click **"Add route"** on the router
2. Name it: `New Email`
3. Click the **wrench icon** 🔧 between the router and this route
4. Click **"Set up a filter"**
5. Configure the filter:
   - **Label**: `New Email`
   - **Condition**:
     - Field: Click and select `{{X.status}}` (where X is the module number of your Ingest Email HTTP module)
     - Operator: **Text operators** → **Equal to**
     - Value: `ok`
6. Click **"OK"**
7. After this route, add your existing **Parse Events** and **Insert Events** modules

#### 3. Create Route 2: Already Exists (Stop)

1. Click **"Add route"** on the router again
2. Name it: `Already Exists (Skip)`
3. Click the **wrench icon** 🔧 between the router and this route
4. Click **"Set up a filter"**
5. Configure the filter:
   - **Label**: `Already Exists`
   - **Condition**:
     - Field: `{{X.status}}` (Ingest Email module)
     - Operator: **Text operators** → **Equal to**
     - Value: `already_exists`
6. Click **"OK"**
7. After this route, you can either:
   - Leave it empty (execution stops here)
   - Add a **Set Variable** module to count skipped emails
   - Add a **Logger** module to track what was skipped

#### Visual Example

```
┌─────────────────────────────────────────────────────────────┐
│  Gmail Watch Emails                                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  HTTP: Call ingest-email function                           │
│  Returns: {"status": "ok"} or {"status": "already_exists"}  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  ROUTER                                                     │
└───────┬───────────────────────────────────────────┬─────────┘
        │                                           │
        ▼ [Filter: status = "ok"]                  ▼ [Filter: status = "already_exists"]
┌───────────────────┐                      ┌───────────────────┐
│  Parse Email      │                      │  (Empty - Stop)   │
│  Extract Events   │                      │  or Logger        │
└────────┬──────────┘                      └───────────────────┘
         │
         ▼
┌───────────────────┐
│  Iterator         │
│  (Loop Events)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  HTTP: Insert     │
│  Event            │
└───────────────────┘
```

---

## Solution 3: Use Upsert Instead of Insert (Advanced)

Instead of inserting events and handling duplicates, you can use PostgreSQL's `UPSERT` functionality.

### Create an Upsert Function

Run this in **Supabase SQL Editor**:

```sql
CREATE OR REPLACE FUNCTION upsert_event(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL,
  p_venue_name TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_city TEXT DEFAULT 'New York',
  p_source_event_url TEXT DEFAULT NULL,
  p_created_via TEXT DEFAULT 'import',
  p_source_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  created BOOLEAN
) AS $$
DECLARE
  v_event_id UUID;
  v_created BOOLEAN;
BEGIN
  -- Try to insert, on conflict do nothing
  INSERT INTO events (
    title, description, start_time, end_time, venue_name,
    neighborhood, city, source_event_url, created_via, source_id
  )
  VALUES (
    p_title, p_description, p_start_time, p_end_time, p_venue_name,
    p_neighborhood, p_city, p_source_event_url, p_created_via, p_source_id
  )
  ON CONFLICT ON CONSTRAINT idx_events_unique_title_venue_time
  DO NOTHING
  RETURNING events.id INTO v_event_id;

  IF v_event_id IS NOT NULL THEN
    v_created := TRUE;
  ELSE
    -- Event already exists, fetch it
    v_created := FALSE;
    SELECT events.id INTO v_event_id
    FROM events
    WHERE
      LOWER(TRIM(events.title)) = LOWER(TRIM(p_title))
      AND LOWER(TRIM(COALESCE(events.venue_name, ''))) = LOWER(TRIM(COALESCE(p_venue_name, '')))
      AND events.start_time = p_start_time
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT v_event_id, p_title, v_created;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_event TO authenticated, anon, service_role;
```

### Use Upsert in Make.com

Change your **Insert Event** HTTP module:

**URL:**
```
https://YOUR-PROJECT.supabase.co/rest/v1/rpc/upsert_event
```

**Method:** `POST`

**Body:**
```json
{
  "p_title": "Event Title",
  "p_description": "Description...",
  "p_start_time": "2025-12-15T19:00:00-05:00",
  "p_end_time": "2025-12-15T22:00:00-05:00",
  "p_venue_name": "Venue Name",
  "p_neighborhood": "Brooklyn",
  "p_city": "New York",
  "p_source_event_url": "https://example.com/event",
  "p_created_via": "import"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Event Title",
  "created": true  // true = new event, false = already exists
}
```

---

## Summary & Recommendations

### ✅ What You Should Do

1. **Apply the duplicate prevention migration** (Solution 1)
   - Run the SQL in Supabase SQL Editor
   - This prevents duplicates at the database level

2. **Add a Router in Make.com** (Solution 2)
   - Stops processing when email is already ingested
   - Saves Make.com operations (free tier = 1,000/month)
   - Prevents unnecessary API calls

3. **Set error handling on Insert Events**
   - Right-click module → **Error handler** → **Ignore**
   - This gracefully handles any remaining duplicate errors

### Why This Matters

- **Saves Money**: Fewer Make.com operations used
- **Prevents Clutter**: No duplicate events in your database
- **Better Performance**: Faster execution, less processing
- **Idempotency**: Safe to re-run scenarios without side effects

---

## Testing Your Setup

### Test 1: Run Scenario Twice on Same Email

1. Run your Make.com scenario manually
2. Check execution history - should process the email
3. Run the scenario again (manually)
4. Check execution history:
   - Ingest Email should return `"status": "already_exists"`
   - Router should stop at "Already Exists" route
   - No events inserted

### Test 2: Try to Insert Duplicate Event

1. Insert an event via Make.com
2. Try to insert the exact same event again (same title, venue, time)
3. Should fail with error `23505` (duplicate key)
4. If you added error handler, it should be ignored
5. Check Supabase - only one event exists

### Test 3: Verify Unique Constraints

Run this SQL in Supabase to see your constraints:

```sql
-- Check unique indexes on events table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND indexdef LIKE '%UNIQUE%';
```

You should see:
- `idx_events_unique_title_venue_time`
- `idx_events_unique_source_url`

---

## Troubleshooting

### "Router not working - still processing duplicates"

- Make sure you're checking the `status` field from the Ingest Email response
- The field should be exactly `{{X.status}}` where X is the module number
- The value should be exactly `ok` or `already_exists` (case-sensitive)

### "Insert still creating duplicates"

- Verify the unique indexes exist: `\d events` in psql or check in Supabase Table Editor
- Make sure you're applying the migration in the correct database
- Check that your events have `start_time` values (WHERE clause requires it)

### "Getting error 23505 in Make.com"

- This is expected when trying to insert duplicates
- Add an error handler (Ignore) to the Insert Event module
- Or use the upsert function instead

---

## 🎉 Done!

Your Make.com scenario now:
- ✅ Skips already-ingested emails
- ✅ Prevents duplicate events at database level
- ✅ Handles errors gracefully
- ✅ Is fully idempotent (safe to run multiple times)
