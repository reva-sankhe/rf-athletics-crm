# Supabase Database Structure

**Project:** RF Athletics CRM  
**Date:** April 27, 2026  
**Database URL:** `https://uocwcewtbcdcrejwvuki.supabase.co`

---

## Overview

This database stores athlete profiles, performance data, competition results, and World Athletics (WA) reference data for the Reliance Foundation Athletics program.

### Total Data
- **13 Tables**
- **27,631 Total Records**
- **42 Athletes** tracked

---

## 📊 Database Tables

### 1. Core Athlete Tables

#### `wa_athlete_profiles` (42 records)
**Purpose:** Central athlete profile information from World Athletics

**Columns:**
- `aa_athlete_id` (PK): Unique athlete identifier
- `reliance_name`: Athlete's name as registered
- `birth_date`: Date of birth
- `nationality`: Country code (e.g., "IND")
- `gender`: "M" or "F"
- `scraped_at`: Last data update timestamp
- `reliance_events`: Comma-separated list of athlete's events
- `age`: Current age (calculated)

**Relationships:**
- Referenced by: `athlete_events`, `wa_athlete_pbs`, `wa_athlete_honours`, `wa_athlete_season_bests`, `wa_rf_athlete_results`

---

#### `athlete_events` (52 records)
**Purpose:** Normalized athlete events with main event designation

**Columns:**
- `id` (PK, UUID): Unique event assignment ID
- `aa_athlete_id` (FK): Links to `wa_athlete_profiles`
- `event_name`: Standardized event name (e.g., "Women's 100m")
- `is_main_event`: Boolean flag for primary event
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Relationships:**
- Foreign Key: `aa_athlete_id` → `wa_athlete_profiles(aa_athlete_id)` ON DELETE CASCADE

**Indexes:**
- `idx_athlete_events_athlete_id` on `aa_athlete_id`
- `idx_athlete_events_event_name` on `event_name`
- `idx_athlete_events_main` on `(aa_athlete_id, is_main_event)` WHERE `is_main_event = true`

**Notes:**
- Replaces the comma-separated `reliance_events` field
- Each athlete can have multiple events
- Exactly one event per athlete should be marked as `is_main_event`

---

#### `players` (0 records)
**Purpose:** Internal athlete roster management (currently empty)

**Columns:** 
- (Schema not visible - table empty)

**Notes:**
- Intended for internal CRM athlete tracking
- Maps to `wa_athlete_profiles` via athlete code/ID
- May need to be populated or deprecated

---

### 2. Performance Data Tables

#### `wa_athlete_pbs` (203 records)
**Purpose:** Personal best performances for each athlete

**Columns:**
- `id` (PK, UUID): Unique PB record ID
- `aa_athlete_id` (FK): Links to `wa_athlete_profiles`
- `discipline`: Event/discipline name (e.g., "100m")
- `mark`: Performance value (e.g., "10.45", "65.24m")
- `wind`: Wind reading for track events (e.g., "+1.2")
- `venue`: Location where PB was achieved
- `date`: Date of performance

**Relationships:**
- Links to: `wa_athlete_profiles` via `aa_athlete_id`

**Known Issues:**
- 9 athletes have duplicate PB entries (see DATA_RECONCILIATION_SUMMARY.md)
- 16 athletes missing PBs for their main events

---

#### `wa_athlete_season_bests` (79 records)
**Purpose:** Current season best performances

**Columns:**
- `id` (PK, UUID): Unique SB record ID
- `aa_athlete_id` (FK): Links to `wa_athlete_profiles`
- `discipline`: Event/discipline name
- `mark`: Performance value
- `wind`: Wind reading (nullable)
- `venue`: Competition location
- `date`: Date of performance

**Relationships:**
- Links to: `wa_athlete_profiles` via `aa_athlete_id`

---

#### `wa_athlete_honours` (118 records)
**Purpose:** Medals, awards, and achievements

**Columns:**
- `id` (PK, UUID): Unique honour record ID
- `aa_athlete_id` (FK): Links to `wa_athlete_profiles`
- `category_name`: Competition category (e.g., "Senior", "U20")
- `competition`: Competition name (e.g., "Asian Games")
- `discipline`: Event where honour was earned
- `place`: Finish position (e.g., "1", "2", "3")
- `mark`: Performance at the competition
- `date`: Date of achievement

**Relationships:**
- Links to: `wa_athlete_profiles` via `aa_athlete_id`

---

### 3. Competition & Results Tables

#### `wa_rf_athlete_results` (1,070 records)
**Purpose:** Detailed competition results for Reliance Foundation athletes

**Columns:**
- `id` (PK, UUID): Unique result ID
- `aa_athlete_id` (FK): Links to `wa_athlete_profiles`
- `athlete_name`: Name of athlete
- `year`: Competition year
- `date`: Competition date
- `competition`: Competition name
- `competition_id`: Reference to competition
- `venue`: Competition location
- `country`: Country code
- `indoor`: Boolean - indoor vs outdoor
- `discipline`: Event name
- `category`: Age category
- `race`: Heat/round information
- `place`: Finish position
- `mark`: Performance
- `wind`: Wind reading (nullable)
- `result_score`: Numeric score for ranking
- `remark`: Additional notes
- `not_legal`: Boolean - wind-legal flag
- `scraped_at`: Data collection timestamp

**Relationships:**
- Links to: `wa_athlete_profiles` via `aa_athlete_id`
- Links to: `wa_competitions` via `competition_id`

---

#### `wa_competitions` (0 records)
**Purpose:** Competition/meet information (currently empty)

**Notes:**
- Currently unpopulated
- Referenced by `wa_results` and `wa_rf_athlete_results`
- Should contain competition metadata when populated

---

#### `wa_results` (0 records)
**Purpose:** General competition results (currently empty)

**Notes:**
- Currently unpopulated
- Intended for broader WA competition data
- Different from `wa_rf_athlete_results` which is RF-specific

---

### 4. Reference Data Tables

#### `wa_qualification_standards` (88 records)
**Purpose:** Olympic, World Championship, and other competition qualification standards

**Columns:**
- `id` (PK, UUID): Unique standard ID
- `competition`: Competition name (e.g., "Olympic Games", "World Championships")
- `year`: Year of standard
- `event`: Event name
- `gender`: "M" or "F"
- `standard`: Qualifying performance (e.g., "10.00", "65.00m")

**Use Cases:**
- Check if athlete has met qualification standards
- Compare performances against qualification requirements

---

#### `wa_rankings` (4,897 records)
**Purpose:** World Athletics official rankings data

**Columns:**
- `id` (PK, UUID): Unique ranking record ID
- `event_group`: Event/discipline name
- `rank`: World ranking position
- `athlete_name`: Name of ranked athlete
- `country`: Country code
- `rank_date`: Date of ranking
- `scraped_at`: Data collection timestamp
- `ranking_score`: WA ranking points

**Use Cases:**
- Track RF athletes' world rankings
- Benchmark against international competition
- Identify top competitors in each event

---

#### `wa_toplists` (20,994 records)
**Purpose:** World Athletics annual toplists (top performances worldwide)

**Columns:**
- `id` (PK, UUID): Unique toplist record ID
- `event`: Event name
- `gender`: "M" or "F"
- `year`: Season year
- `rank`: Position in toplist
- `mark`: Performance
- `wind`: Wind reading (nullable)
- `athlete_name`: Athlete name
- `nationality`: Country code
- `venue`: Competition location
- `date`: Performance date
- `score`: Performance score
- `scraped_at`: Data collection timestamp
- `region`: Geographic region

**Use Cases:**
- Compare RF athletes against world's best
- Track seasonal progressions
- Identify performance benchmarks

---

### 5. Mapping Tables

#### `wa_athlete_id_map` (0 records)
**Purpose:** Maps result athlete IDs to profile athlete IDs (currently empty)

**Notes:**
- Used to link different athlete ID systems
- Currently unpopulated for all 42 athletes
- May not be required if ID mapping is handled elsewhere

---

## 🔗 Database Relationships

### Primary Relationships

```
wa_athlete_profiles (Central Hub)
    ├── athlete_events (via aa_athlete_id)
    ├── wa_athlete_pbs (via aa_athlete_id)
    ├── wa_athlete_season_bests (via aa_athlete_id)
    ├── wa_athlete_honours (via aa_athlete_id)
    └── wa_rf_athlete_results (via aa_athlete_id)

wa_competitions
    ├── wa_results (via competition_id)
    └── wa_rf_athlete_results (via competition_id)
```

### Foreign Key Constraints

**athlete_events:**
- `aa_athlete_id` → `wa_athlete_profiles(aa_athlete_id)` ON DELETE CASCADE

---

## 📈 Data Quality Summary

### ✅ Strengths
- **Rich athlete data:** 42 athletes with comprehensive profiles
- **Performance tracking:** 203 PBs, 79 season bests
- **Competition history:** 1,070 detailed results
- **Achievement tracking:** 118 honours/medals
- **Reference data:** 4,897 rankings, 20,994 toplist entries, 88 qualification standards
- **Normalized events:** Clean `athlete_events` table with main event designation
- **Standard taxonomy:** 93 standardized event names (see EVENT_TAXONOMY.md)

### ⚠️ Areas for Attention
1. **Empty tables:** `players`, `wa_competitions`, `wa_results`, `wa_athlete_id_map`
2. **Duplicate PBs:** 9 athletes have duplicate personal best entries
3. **Missing data:** 16 athletes missing PBs for their main events
4. **ID mapping:** No entries in `wa_athlete_id_map` table

---

## 🔒 Row-Level Security (RLS)

### Enabled Tables with Public Read Access
The following tables have RLS enabled with public read policies:
- `wa_athlete_profiles`
- `wa_rankings`
- `wa_rf_athlete_results`
- `wa_qualification_standards`
- `wa_toplists`

**Policy:** Both `anon` and `authenticated` roles can read (SELECT) these tables.

---

## 🛠️ Recent Migrations

1. **20260423_create_athlete_events.sql**
   - Created `athlete_events` table
   - Migrated data from `reliance_events` comma-separated field
   - Added foreign key constraint and indexes

2. **20260424_enable_public_read_wa_tables.sql**
   - Enabled RLS on WA reference tables
   - Created public read policies

3. **20260424_normalize_event_names_v2.sql**
   - Standardized event naming conventions

---

## 📝 Event Taxonomy

The database uses a standardized event naming convention:
- **Format:** `Gender's Distance/Event (Specification)`
- **Examples:** 
  - "Women's 100m"
  - "Men's Shot Put (6kg)"
  - "Mixed 4x400m Relay"

**Total standardized events:** 93  
(See EVENT_TAXONOMY.md for complete list)

---

## 🔧 Connection Details

### API Connection
- **URL:** `https://uocwcewtbcdcrejwvuki.supabase.co`
- **Auth:** Uses `VITE_SUPABASE_ANON_KEY` for public read access
- **Client:** `@supabase/supabase-js`

### Direct Database Connection
- **Format:** `postgresql://postgres:[PASSWORD]@db.uocwcewtbcdcrejwvuki.supabase.co:5432/postgres`
- **Note:** Direct connection requires database password (not stored in .env)

---

## 📚 Related Documentation

- `EVENT_TAXONOMY.md` - Complete list of 93 standardized event names
- `DATA_RECONCILIATION_SUMMARY.md` - Data quality issues and fixes
- `supabase/migrations/README.md` - Migration guide and instructions
- `src/lib/types.ts` - TypeScript interfaces for all tables
- `src/lib/queries.ts` - Query functions for accessing data

---

## 🎯 Next Steps

1. **Populate empty tables:**
   - Consider populating `players` or deprecating it
   - Add competition data to `wa_competitions`
   - Determine if `wa_athlete_id_map` is needed

2. **Data cleanup:**
   - Remove duplicate personal bests (9 athletes affected)
   - Add missing PBs for main events (16 athletes)

3. **Performance optimization:**
   - Consider adding indexes on frequently queried columns
   - Monitor query performance with large result sets

---

**Last Updated:** April 27, 2026, 12:06 PM IST  
**Generated by:** Database inspection script (`scripts/inspect-database-schema.ts`)
