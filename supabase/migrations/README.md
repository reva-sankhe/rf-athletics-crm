# Database Migration: Athlete Events

## Overview
This migration creates a normalized `athlete_events` table to replace the comma-separated `reliance_events` field in `wa_athlete_profiles`. This enables better querying, filtering, and management of athlete events with a `main_event` flag.

## What This Migration Does

1. **Creates `athlete_events` table** with:
   - `id`: UUID primary key
   - `aa_athlete_id`: Foreign key to `wa_athlete_profiles`
   - `event_name`: The name of the event (e.g., "100m", "Long Jump")
   - `is_main_event`: Boolean flag indicating the athlete's primary event
   - `created_at` and `updated_at`: Timestamps

2. **Migrates existing data**: Automatically parses the comma-separated `reliance_events` field and creates individual records in the new table

3. **Sets main events**: The first event in each athlete's list is marked as the main event

4. **Creates indexes** for optimal query performance

## How to Run This Migration

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `20260423_create_athlete_events.sql`
5. Paste into the SQL editor
6. Click **Run** button
7. Verify success message

### Option 2: Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/revasankhe/Library/Mobile Documents/com~apple~CloudDocs/rf-rcm

# Run the migration
npx supabase db push

# Or if you have the Supabase CLI installed globally
supabase db push
```

### Option 3: Direct SQL Execution

If you have `psql` access to your database:

```bash
psql "postgresql://[YOUR_CONNECTION_STRING]" -f supabase/migrations/20260423_create_athlete_events.sql
```

## Verification Steps

After running the migration, verify it worked correctly:

### 1. Check Table Creation
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'athlete_events';
```

### 2. Check Data Migration
```sql
-- Count total events
SELECT COUNT(*) as total_events FROM athlete_events;

-- Count athletes with main events
SELECT COUNT(DISTINCT aa_athlete_id) as athletes_with_main_event 
FROM athlete_events 
WHERE is_main_event = true;

-- View sample data
SELECT * FROM athlete_events LIMIT 10;
```

### 3. Check Main Event Assignment
```sql
-- Should show 1 main event per athlete
SELECT aa_athlete_id, COUNT(*) as main_event_count
FROM athlete_events 
WHERE is_main_event = true
GROUP BY aa_athlete_id
HAVING COUNT(*) > 1;

-- Should return 0 rows (no athlete should have multiple main events)
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop the table (this will also remove all migrated data)
DROP TABLE IF EXISTS athlete_events CASCADE;
```

**Note**: The original `reliance_events` column is preserved, so no data is lost.

## Impact on Application

### Frontend Changes
- ✅ New types added: `AthleteEvent`, `PersonalBestWithEvent`
- ✅ New queries: `fetchAthleteEvents()`, `fetchPersonalBestsForAthleteEvents()`
- ✅ UI updated: Player Detail page now shows PBs for all athlete events
- ✅ Main event highlighted with special styling

### Backward Compatibility
- ✅ Original `reliance_events` field preserved
- ✅ Graceful error handling if migration not run
- ✅ Application will work (with warnings) even if migration hasn't been applied

## Future Enhancements

Once this migration is stable, you can:
1. Add more event metadata (rankings, records, etc.)
2. Create admin UI to manage athlete events
3. Eventually deprecate the `reliance_events` column
4. Add support for event categories and seasons

## Troubleshooting

### "relation already exists" Error
If you see this error, the table already exists. Either:
- Skip the migration (already applied)
- Drop the table first and re-run

### "foreign key constraint" Error
Ensure `wa_athlete_profiles` table exists with `aa_athlete_id` column before running migration.

### No Data After Migration
Check if `reliance_events` field has data:
```sql
SELECT COUNT(*) FROM wa_athlete_profiles WHERE reliance_events IS NOT NULL;
```

## Support

For issues or questions about this migration, please check:
- Supabase logs in the Dashboard
- Application console for warnings
- This README for troubleshooting steps
