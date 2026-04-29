# Athlete Events Views Documentation

## Overview

Two comprehensive database views have been created to consolidate all event data for the 42 athletes tracked in `wa_athlete_profiles`. These views join data from multiple tables to provide a unified view of athlete performance.

## Views Created

### 1. `athlete_all_events_data` 
**Purpose**: Comprehensive view with all available event data

**Columns**:
- **Athlete Info**: `aa_athlete_id`, `athlete_name`, `gender`, `birth_date`, `nationality`
- **Event Info**: `event_name`, `is_main_event`
- **Personal Bests**: `pb_id`, `pb_discipline`, `pb_mark`, `pb_venue`, `pb_date`, `pb_not_wind_legal`, `pb_updated_at`
- **Season Bests**: `sb_id`, `sb_discipline`, `sb_mark`, `sb_venue`, `sb_date`, `sb_not_wind_legal`, `sb_updated_at`
- **Latest Result**: `latest_result_id`, `latest_result_discipline`, `latest_result_mark`, `latest_result_place`, `latest_result_venue`, `latest_result_date`, `latest_result_competition`, `latest_result_not_wind_legal`
- **Metrics**: `total_results_count`

### 2. `athlete_events_summary`
**Purpose**: Simplified summary view for quick analysis

**Columns**:
- **Basic Info**: `aa_athlete_id`, `athlete_name`, `gender`, `event_name`, `is_main_event`
- **Performance**: `personal_best`, `pb_date`, `pb_venue`, `season_best`, `sb_date`
- **Activity**: `result_count`, `last_competed`, `best_competition_result`

## Data Sources

The views consolidate data from:
- `wa_athlete_profiles` - Athlete demographic information
- `athlete_events` - Normalized athlete events table
- `wa_athlete_pbs` - Personal best performances
- `wa_athlete_season_bests` - Season best performances
- `wa_rf_athlete_results` - Competition results

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended ✅)

1. Go to your Supabase project: https://supabase.com/dashboard/project/uocwcewtbcdcrejwvuki
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file: `supabase/migrations/20260424_create_athlete_events_view.sql`
5. Copy the entire SQL content
6. Paste into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Verify success ✅

### Option 2: Verify Installation

After running the migration, test with:

```bash
npm exec tsx scripts/test-athlete-views.ts
```

This will verify the views exist and show sample data.

## Example Queries

### Query 1: Get all events for a specific athlete
```sql
SELECT * 
FROM athlete_events_summary 
WHERE aa_athlete_id = '14201847'
ORDER BY is_main_event DESC;
```

### Query 2: Find athletes with their main events and PBs
```sql
SELECT 
    athlete_name,
    event_name,
    personal_best,
    pb_date,
    pb_venue
FROM athlete_events_summary
WHERE is_main_event = true
ORDER BY athlete_name;
```

### Query 3: Athletes who competed recently
```sql
SELECT 
    athlete_name,
    event_name,
    last_competed,
    result_count
FROM athlete_events_summary
WHERE last_competed >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY last_competed DESC;
```

### Query 4: Multi-event athletes
```sql
SELECT 
    athlete_name,
    COUNT(*) as event_count,
    STRING_AGG(event_name, ', ' ORDER BY is_main_event DESC) as events
FROM athlete_events_summary
GROUP BY athlete_name, aa_athlete_id
HAVING COUNT(*) > 1
ORDER BY event_count DESC;
```

### Query 5: Performance summary with all details
```sql
SELECT 
    athlete_name,
    event_name,
    pb_mark,
    pb_venue,
    latest_result_mark,
    latest_result_competition,
    total_results_count
FROM athlete_all_events_data
WHERE is_main_event = true
ORDER BY athlete_name;
```

### Query 6: Athletes without recent activity
```sql
SELECT 
    athlete_name,
    event_name,
    last_competed,
    result_count
FROM athlete_events_summary
WHERE last_competed IS NULL 
   OR last_competed < CURRENT_DATE - INTERVAL '180 days'
ORDER BY last_competed NULLS FIRST;
```

## Benefits

### ✅ Simplified Queries
Instead of joining 4-5 tables, query a single view.

### ✅ Consistent Data
Event matching logic is centralized in the view definition.

### ✅ Better Performance
Views can be indexed and optimized by PostgreSQL.

### ✅ Easy Analysis
Quickly analyze athlete performance across all events.

### ✅ Frontend Integration
Easy to query from your application using Supabase client:

```typescript
import { supabase } from './lib/supabase';

// Get athlete event summary
const { data, error } = await supabase
  .from('athlete_events_summary')
  .select('*')
  .eq('aa_athlete_id', athleteId);

// Get comprehensive data
const { data: fullData } = await supabase
  .from('athlete_all_events_data')
  .select('*')
  .eq('aa_athlete_id', athleteId)
  .eq('is_main_event', true);
```

## Integration with TypeScript

Add these types to `src/lib/types.ts`:

```typescript
export interface AthleteEventSummary {
  aa_athlete_id: string;
  athlete_name: string;
  gender: string;
  event_name: string;
  is_main_event: boolean;
  personal_best: string | null;
  pb_date: string | null;
  pb_venue: string | null;
  season_best: string | null;
  sb_date: string | null;
  result_count: number;
  last_competed: string | null;
  best_competition_result: string | null;
}

export interface AthleteAllEventsData {
  aa_athlete_id: string;
  athlete_name: string;
  gender: string;
  birth_date: string | null;
  nationality: string | null;
  event_name: string;
  is_main_event: boolean;
  pb_id: string | null;
  pb_discipline: string | null;
  pb_mark: string | null;
  pb_venue: string | null;
  pb_date: string | null;
  pb_not_wind_legal: boolean | null;
  pb_updated_at: string | null;
  sb_id: string | null;
  sb_discipline: string | null;
  sb_mark: string | null;
  sb_venue: string | null;
  sb_date: string | null;
  sb_not_wind_legal: boolean | null;
  sb_updated_at: string | null;
  latest_result_id: string | null;
  latest_result_discipline: string | null;
  latest_result_mark: string | null;
  latest_result_place: string | null;
  latest_result_venue: string | null;
  latest_result_date: string | null;
  latest_result_competition: string | null;
  latest_result_not_wind_legal: boolean | null;
  total_results_count: number;
}
```

## Support

After running the migration, if you encounter any issues:

1. Check Supabase logs in the Dashboard
2. Run the test script: `npm exec tsx scripts/test-athlete-views.ts`
3. Verify tables exist: Check that `athlete_events`, `wa_athlete_pbs`, `wa_athlete_season_bests`, and `wa_rf_athlete_results` tables are accessible

## Next Steps

1. ✅ Run the migration in Supabase SQL Editor
2. ✅ Test with `npm exec tsx scripts/test-athlete-views.ts`
3. ✅ Integrate into your application's query layer
4. ✅ Update UI components to use the new views
5. ✅ Monitor performance and optimize as needed

---

**Created**: April 24, 2026  
**Migration File**: `supabase/migrations/20260424_create_athlete_events_view.sql`  
**Test Script**: `scripts/test-athlete-views.ts`
