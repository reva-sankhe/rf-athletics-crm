# Event Benchmarks Implementation

**Date:** April 27, 2026  
**Feature:** Event-specific competition benchmarks and RF targets

---

## Overview

This implementation adds a comprehensive benchmarking system for athletics events, allowing you to track and display:
- Qualification standards for major competitions
- Medal results and medallists' ages from past competitions
- Reliance Foundation internal performance targets

## What Was Implemented

### 1. Database Schema (`event_benchmarks` table)

A new table that stores benchmark data for each event with the following structure:

**Columns:**
- `id` (UUID) - Primary key
- `event_name` (VARCHAR, UNIQUE) - Standardized event name
- `gender` (CHAR) - Automatically extracted from event name ('M'/'F')
- **Qualification Standards:**
  - `asian_games_qual_standard`
  - `commonwealth_games_qual_standard`
- **Olympic Games Medals:**
  - `olympic_gold_result`, `olympic_gold_age`
  - `olympic_silver_result`, `olympic_silver_age`
  - `olympic_bronze_result`, `olympic_bronze_age`
- **Asian Games Medals:**
  - `asian_games_gold_result`, `asian_games_gold_age`
  - `asian_games_silver_result`, `asian_games_silver_age`
  - `asian_games_bronze_result`, `asian_games_bronze_age`
- **Commonwealth Games Medals:**
  - `cwg_gold_result`, `cwg_gold_age`
  - `cwg_silver_result`, `cwg_silver_age`
  - `cwg_bronze_result`, `cwg_bronze_age`
- **RF Targets:**
  - `rf_target` - Performance target
  - `rf_target_notes` - Additional context
- **Metadata:**
  - `created_at`, `updated_at`, `updated_by`

**Features:**
- Automatic gender extraction from event name via trigger
- Automatic timestamp updates via trigger
- Row-Level Security (RLS) enabled
- Public read access, authenticated write access
- Unique constraint on event_name

### 2. TypeScript Types

Added `EventBenchmark` interface in `src/lib/types.ts` with full type safety for all fields.

### 3. Query Functions

Added in `src/lib/queries.ts`:
- `fetchEventBenchmark(eventName)` - Get benchmarks for a specific event
- `fetchAllEventBenchmarks()` - Get all benchmarks
- `upsertEventBenchmark(benchmark)` - Create or update benchmarks
- `deleteEventBenchmark(eventName)` - Delete benchmarks

### 4. UI Integration

**EventDetail Page (`src/pages/EventDetail.tsx`):**
- Beautiful card-based layout showing all benchmark data
- Organized sections for:
  - Qualification Standards (Asian Games, Commonwealth Games)
  - Olympic Games Medals (Gold/Silver/Bronze with ages)
  - Asian Games Medals (Gold/Silver/Bronze with ages)
  - Commonwealth Games Medals (Gold/Silver/Bronze with ages)
  - RF Target (with notes)
- Color-coded medal cards (gold, silver, bronze)
- Graceful handling of missing data (shows "—" for unset fields)
- Only displays benchmark section if data exists for the event

---

## How to Use

### Step 1: Run the Migration

You need to run the migration to create the `event_benchmarks` table in your Supabase database.

**Option A: Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `supabase/migrations/20260427_create_event_benchmarks.sql`
5. Copy the entire contents
6. Paste into the SQL editor
7. Click **Run**
8. Verify success message

**Option B: Using psql**
```bash
# If you have database credentials
psql "your-connection-string" -f supabase/migrations/20260427_create_event_benchmarks.sql
```

**Verification:**
```sql
-- Check table was created
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'event_benchmarks';

-- Check structure
\d event_benchmarks
```

### Step 2: Add Benchmark Data

You can add benchmarks in several ways:

**Method 1: Direct SQL Insert**
```sql
INSERT INTO event_benchmarks (
  event_name,
  asian_games_qual_standard,
  commonwealth_games_qual_standard,
  olympic_gold_result,
  olympic_gold_age,
  rf_target,
  rf_target_notes
) VALUES (
  'Women''s 100m Hurdles',
  '12.80s',
  '12.90s',
  '12.26s',
  24,
  'Break 13.00s consistently',
  'Target for 2026 Asian Games qualification'
);
```

**Method 2: Via Frontend (Future)**
An admin interface can be built to allow editing benchmarks directly from the UI.

**Method 3: Bulk Import Script** (Future)
Create a CSV/JSON file and import multiple events at once.

### Step 3: View Benchmarks

1. Navigate to any event page in your app (e.g., `/events/Women's%20100m%20Hurdles`)
2. If benchmarks exist for that event, they will automatically display
3. The page will show all set benchmark values organized by category

---

## Data Format Guidelines

### Performance Marks
- **Track events:** Use format like "10.45s", "1:43.21"
- **Field events:** Use format like "6.85m", "85.43m"
- **Be consistent** with units and formatting

### Ages
- Integer values only
- Age at the time of performance

### RF Targets
- Clear, actionable targets
- Example: "Break 13.00s", "Top 8 at Asian Games", "6.90m or better"

### RF Target Notes
- Additional context or strategy
- Example: "Focus on start technique", "Peak for Asian Games 2026"

---

## Example Benchmark Entry

Here's a complete example for Women's 100m Hurdles:

```sql
INSERT INTO event_benchmarks (
  event_name,
  asian_games_qual_standard,
  commonwealth_games_qual_standard,
  
  olympic_gold_result,
  olympic_gold_age,
  olympic_silver_result,
  olympic_silver_age,
  olympic_bronze_result,
  olympic_bronze_age,
  
  asian_games_gold_result,
  asian_games_gold_age,
  asian_games_silver_result,
  asian_games_silver_age,
  asian_games_bronze_result,
  asian_games_bronze_age,
  
  cwg_gold_result,
  cwg_gold_age,
  cwg_silver_result,
  cwg_silver_age,
  cwg_bronze_result,
  cwg_bronze_age,
  
  rf_target,
  rf_target_notes,
  updated_by
) VALUES (
  'Women''s 100m Hurdles',
  '12.80s',
  '12.95s',
  
  '12.26s', 24,
  '12.32s', 26,
  '12.34s', 23,
  
  '12.72s', 25,
  '12.84s', 24,
  '12.91s', 26,
  
  '12.78s', 27,
  '12.89s', 24,
  '12.94s', 25,
  
  'Break 13.00s barrier',
  'Target Asian Games 2026 qualification. Focus on hurdle technique and speed endurance.',
  'Admin'
);
```

---

## Future Enhancements

### Phase 2: Admin UI
- Add "Edit Benchmarks" button on event pages
- Create modal/form for editing all benchmark fields
- User permissions/roles for who can edit
- Audit trail of changes

### Phase 3: Athlete Comparisons
- Show athlete's PB vs benchmarks
- Highlight if athlete has met qualification standards
- Distance from target visualization
- Progress tracking over time

### Phase 4: Additional Competitions
Easy to extend the schema to add:
- World Championships
- Diamond League standards
- National Championships
- Custom competitions

**Adding new competition:**
```sql
ALTER TABLE event_benchmarks 
ADD COLUMN world_champs_gold_result VARCHAR,
ADD COLUMN world_champs_gold_age INTEGER;
```

### Phase 5: Historical Data
- Track changes over time
- View previous Olympics/Asian Games results
- Year-specific standards

---

## Database Relationships

```
event_benchmarks
    ↓ (via event_name matching)
athlete_events
    ↓ (via aa_athlete_id)
wa_athlete_profiles
```

**Use Cases:**
1. Display benchmarks on event pages ✅ (Implemented)
2. Compare athlete PBs to standards (Future)
3. Track athlete progress toward targets (Future)
4. Generate reports on team readiness (Future)

---

## Security & Permissions

**Current Setup:**
- **Public (anon) users:** Can read (SELECT) all benchmarks
- **Authenticated users:** Can create, update, delete benchmarks
- **RLS Enabled:** Protects data at the database level

**Recommended for Production:**
```sql
-- More restrictive: Only admins can write
CREATE POLICY "Admin only write" ON event_benchmarks
  FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');
```

---

## Troubleshooting

### Migration Fails
**Error:** "relation already exists"
- The table may already exist. Check with `\d event_benchmarks` or drop and recreate

### No Benchmarks Display
- Check if migration was run successfully
- Verify benchmarks exist: `SELECT * FROM event_benchmarks;`
- Check browser console for errors

### Can't Edit Benchmarks
- Ensure you're authenticated (if using authenticated-only policies)
- Check RLS policies are set correctly
- Verify your user has write permissions

---

## Files Modified/Created

### Created:
- `supabase/migrations/20260427_create_event_benchmarks.sql` - Database migration
- `EVENT_BENCHMARKS_IMPLEMENTATION.md` - This documentation

### Modified:
- `src/lib/types.ts` - Added `EventBenchmark` interface
- `src/lib/queries.ts` - Added benchmark query functions
- `src/pages/EventDetail.tsx` - Added benchmark display UI

---

## Support & Maintenance

### Updating Benchmarks
Benchmarks should be updated:
- When new competition results are available
- When qualification standards change
- When RF targets are adjusted
- Annually (for age-based statistics)

### Data Sources
- **World Athletics** for official records and standards
- **Competition websites** for medal results
- **RF coaching staff** for internal targets

---

**Last Updated:** April 27, 2026  
**Version:** 1.0  
**Status:** ✅ Ready for deployment
