# Data Reconciliation Scripts

This directory contains scripts for performing data quality checks and fixes on the athlete database.

## Scripts

### `reconcile-data.ts`

TypeScript script that performs comprehensive data quality checks on all 42 athletes in `wa_athlete_profiles` and related tables.

**What it checks:**
- ✅ Athlete profile completeness (name, birth date, gender, nationality)
- ✅ Age consistency with birth dates
- ✅ Event data quality (formatting, duplicates)
- ✅ Athlete events table synchronization
- ✅ Main event designations
- ✅ Personal bests data quality and completeness
- ✅ Season bests validation
- ✅ Athlete ID mappings
- ✅ Results data consistency

**How to run:**
```bash
npm run reconcile
```

**Output:**
- Console summary with issue counts
- `DATA_RECONCILIATION_REPORT.md` - Detailed findings by athlete
- `DATA_RECONCILIATION_SUMMARY.md` - Executive summary

### `fix-duplicate-pbs.sql`

SQL script to identify and fix duplicate personal best entries for athletes.

**What it does:**
1. Identifies duplicate PB records for the same athlete/discipline
2. Shows detailed view of duplicates
3. Determines which records to keep (best performances)
4. Provides DELETE query to remove duplicates (commented out for safety)

**How to use:**
1. Open Supabase SQL Editor
2. Copy and paste each query section
3. Review the identified duplicates
4. Review which records will be kept/deleted
5. Uncomment and run the DELETE section only after verification

**Safety notes:**
- The DELETE query is commented out by default
- Always review the "IDENTIFY RECORDS TO DELETE" output first
- Consider backing up data before running destructive operations

## Usage Guide

### Step 1: Run Reconciliation
```bash
npm run reconcile
```

Review the generated reports:
- `DATA_RECONCILIATION_SUMMARY.md` for overview
- `DATA_RECONCILIATION_REPORT.md` for details

### Step 2: Fix Issues

#### For Duplicate Personal Bests:
1. Open `scripts/fix-duplicate-pbs.sql`
2. Run queries in Supabase SQL Editor sequentially
3. Review duplicates identified
4. Uncomment and run DELETE after verification

#### For Missing Personal Bests:
1. Review the list of athletes with missing PBs in the report
2. Either:
   - Add missing PB data to `wa_athlete_pbs` table
   - Update main event designation in `athlete_events` table

#### For ID Mappings:
1. Determine if `wa_athlete_id_map` is needed for your use case
2. If needed, populate mappings for athletes with result tracking

### Step 3: Verify Fixes
```bash
npm run reconcile
```

Run reconciliation again to verify issues are resolved.

## Development

### Adding New Checks

To add new data quality checks to `reconcile-data.ts`:

1. Create a new async function (e.g., `checkNewTable()`)
2. Query the relevant Supabase table
3. Add issues using `addIssue()` function
4. Call your function in `main()`

Example:
```typescript
async function checkNewTable() {
  console.log("\n🔍 Checking new table...");
  
  const { data, error } = await supabase
    .from("new_table")
    .select("*");

  if (error) {
    console.error("❌ Error fetching data:", error);
    return;
  }

  for (const record of data) {
    if (/* condition */) {
      addIssue({
        severity: "warning",
        category: "Data Quality",
        athleteId: record.athlete_id,
        athleteName: record.name,
        description: "Issue description",
        suggestedFix: "How to fix"
      });
    }
  }
}
```

### Issue Severity Levels

- **critical**: Must be fixed (e.g., missing required data)
- **warning**: Should be fixed (e.g., data inconsistencies)
- **info**: Nice to have (e.g., optional fields, suggestions)

## Troubleshooting

### "Missing environment variables" error
Ensure `.env` file exists with:
```
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

### SQL queries not working
- Ensure you have proper database permissions
- Check table names match your schema
- Verify column names in your database

### TypeScript errors
```bash
npm install --save-dev tsx dotenv @types/node
```

## Contributing

When adding new reconciliation checks:
1. Document what the check does
2. Provide suggested fixes
3. Use appropriate severity levels
4. Update this README
