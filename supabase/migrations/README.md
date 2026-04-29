# Database Migrations

This directory contains SQL migration files for the RF Athletics CRM database.

## Migration Files

### 20260423_create_athlete_events.sql
- Creates `athlete_events` table to normalize athlete event data
- Migrates data from comma-separated `reliance_events` field
- Adds foreign key constraints and indexes

### 20260424_create_athlete_events_view.sql
- Creates database views for athlete events

### 20260424_enable_public_read_wa_tables.sql
- Enables Row Level Security (RLS) on WA reference tables
- Creates public read policies for `anon` and `authenticated` roles

### 20260424_normalize_event_names_v2.sql
- Standardizes event naming conventions
- Updates to latest event taxonomy (93 standardized events)

### 20260424_normalize_event_names.sql
- Initial event name normalization (deprecated by v2)

### 20260427_create_event_benchmarks.sql
- Creates `event_benchmarks` table for storing qualification standards and medal benchmarks

### 20260429_add_is_senior_field.sql ⭐ NEW
- Adds `is_senior` boolean field to `wa_athlete_profiles`
- Filters junior athletes from dashboard display
- Sets all athletes to senior except Rishabh Giri (junior)

## How to Run Migrations

### Option 1: Supabase SQL Editor (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
3. Copy the contents of the migration file
4. Paste and execute the SQL

### Option 2: Using psql (Direct Database Access)
```bash
psql postgresql://postgres:[PASSWORD]@db.uocwcewtbcdcrejwvuki.supabase.co:5432/postgres -f supabase/migrations/MIGRATION_FILE.sql
```

### Option 3: Using Migration Script (For data updates only)
For migrations that only update data (not DDL), you can use the TypeScript scripts:
```bash
npx tsx scripts/add-is-senior-field.ts
```

## Migration Order

Migrations should be run in chronological order based on the date prefix:
1. 20260423_* (April 23)
2. 20260424_* (April 24)
3. 20260427_* (April 27)
4. 20260429_* (April 29) ← Latest

## Rollback

If you need to rollback the latest migration (is_senior field):
```sql
-- Remove is_senior column
ALTER TABLE wa_athlete_profiles DROP COLUMN is_senior;
```

## Notes

- Always backup your database before running migrations
- Test migrations on a development/staging environment first
- Migrations are designed to be idempotent where possible
- Some migrations include data updates that may take time to execute

## Related Documentation

- `docs/database/DATABASE_STRUCTURE.md` - Complete database schema documentation
- `docs/database/MIGRATION_EXECUTION_FLOW.md` - Detailed migration execution guide
- `docs/database/ATHLETE_EVENTS_VIEWS.md` - Information about database views
