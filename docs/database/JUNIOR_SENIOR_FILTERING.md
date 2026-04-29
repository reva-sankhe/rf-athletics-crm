# Junior/Senior Athlete Filtering

**Date:** April 29, 2026  
**Purpose:** Filter junior athletes from dashboard display while keeping them in the database

## Overview

The RF Athletics CRM now supports filtering junior athletes from the main dashboard. Junior athletes remain in the database with all their data intact, but they won't appear in the athlete lists until they're manually marked as senior.

## Implementation

### Database Schema Change

**New Field:** `is_senior` (BOOLEAN)
- **Table:** `wa_athlete_profiles`
- **Default:** `true` (visible on dashboard)
- **Purpose:** Controls visibility of athletes on the dashboard
  - `true` = Senior athlete (visible)
  - `false` = Junior athlete (hidden)

### Current Configuration

- **All athletes:** Set to senior (`is_senior = true`) by default
- **Rishabh Giri** (ID: 15190370): Set to junior (`is_senior = false`)

### Frontend Behavior

The `fetchWAAthleteProfiles()` function in `src/lib/queries.ts` now:
- Filters to show only senior athletes by default
- Accepts optional `includeJuniors` parameter for admin views
- Updates athlete count to reflect only visible athletes

## How to Run the Migration

### Step 1: Execute SQL in Supabase

Go to the Supabase SQL Editor:
https://uocwcewtbcdcrejwvuki.supabase.co/project/_/sql

Copy and execute the contents of:
`supabase/migrations/20260429_add_is_senior_field.sql`

Or execute this SQL directly:

```sql
-- Add is_senior column (default true = visible on dashboard)
ALTER TABLE wa_athlete_profiles 
ADD COLUMN is_senior BOOLEAN DEFAULT true;

-- Set all athletes to senior initially
UPDATE wa_athlete_profiles 
SET is_senior = true;

-- Mark Rishabh Giri as junior (should not display on dashboard)
UPDATE wa_athlete_profiles 
SET is_senior = false 
WHERE aa_athlete_id = '15190370';

-- Add comment for documentation
COMMENT ON COLUMN wa_athlete_profiles.is_senior IS 
  'Indicates if athlete should be displayed on dashboard. false = Junior (hidden), true = Senior (visible). Can be manually updated as athletes transition from junior to senior status.';
```

### Step 2: Verify the Migration

Run the verification script:
```bash
npx tsx scripts/add-is-senior-field.ts
```

This will show:
- Number of senior athletes (visible)
- Number of junior athletes (hidden)
- List of junior athletes

## Managing Junior/Senior Status

### Mark an Athlete as Junior (Hide from Dashboard)

Using the Supabase MCP tool:
```javascript
await supabase
  .from('wa_athlete_profiles')
  .update({ is_senior: false })
  .eq('aa_athlete_id', 'ATHLETE_ID');
```

Or via SQL:
```sql
UPDATE wa_athlete_profiles 
SET is_senior = false 
WHERE aa_athlete_id = 'ATHLETE_ID';
```

### Promote an Athlete to Senior (Show on Dashboard)

Using the Supabase MCP tool:
```javascript
await supabase
  .from('wa_athlete_profiles')
  .update({ is_senior: true })
  .eq('aa_athlete_id', 'ATHLETE_ID');
```

Or via SQL:
```sql
UPDATE wa_athlete_profiles 
SET is_senior = true 
WHERE aa_athlete_id = 'ATHLETE_ID';
```

### View All Athletes (Including Juniors)

In code, use the optional parameter:
```typescript
const allAthletes = await fetchWAAthleteProfiles(true); // includes juniors
const seniorOnly = await fetchWAAthleteProfiles(); // default - seniors only
```

## Future Enhancements

### Optional: Add Admin Toggle

To allow viewing juniors in the UI, add a toggle in `src/pages/Players.tsx`:

```typescript
const [showJuniors, setShowJuniors] = useState(false);

// In the load function:
const data = await fetchWAAthleteProfiles(showJuniors);

// In the UI:
<Checkbox 
  checked={showJuniors}
  onChange={(e) => setShowJuniors(e.target.checked)}
  label="Show junior athletes"
/>
```

### Optional: Automatic Age-Based Transition

Create a scheduled task or function to automatically promote athletes when they turn 20:

```typescript
// Run periodically (e.g., daily)
const { data: athletes } = await supabase
  .from('wa_athlete_profiles')
  .select('aa_athlete_id, age, is_senior')
  .eq('is_senior', false);

for (const athlete of athletes) {
  if (athlete.age >= 20) {
    await supabase
      .from('wa_athlete_profiles')
      .update({ is_senior: true })
      .eq('aa_athlete_id', athlete.aa_athlete_id);
  }
}
```

## Technical Details

### Files Modified

1. **Database Migration:** `supabase/migrations/20260429_add_is_senior_field.sql`
2. **TypeScript Types:** `src/lib/types.ts` - Added `is_senior: boolean` to `WAAthleteProfile`
3. **Query Functions:** `src/lib/queries.ts` - Updated `fetchWAAthleteProfiles()` with filtering
4. **Migration Script:** `scripts/add-is-senior-field.ts` - Helper script for data updates
5. **Documentation:** 
   - `supabase/migrations/README.md` - Updated with migration info
   - `docs/database/JUNIOR_SENIOR_FILTERING.md` - This file

### TypeScript Type Definition

```typescript
export interface WAAthleteProfile {
  aa_athlete_id: string;
  reliance_name: string;
  birth_date: string | null;
  nationality: string | null;
  gender: string | null;
  scraped_at: string | null;
  reliance_events: string | null;
  age: number | null;
  is_senior: boolean; // ← NEW FIELD
}
```

### Query Function Signature

```typescript
export async function fetchWAAthleteProfiles(
  includeJuniors = false
): Promise<WAAthleteProfile[]>
```

## Rollback

To rollback this change:

```sql
ALTER TABLE wa_athlete_profiles DROP COLUMN is_senior;
```

Then revert the TypeScript changes in `src/lib/types.ts` and `src/lib/queries.ts`.

## Related Documentation

- `docs/database/DATABASE_STRUCTURE.md` - Complete database schema
- `supabase/migrations/README.md` - Migration instructions
- `src/lib/queries.ts` - Query function implementation
