# Migration Execution Flow

**Script:** `supabase/migrations/20260424_normalize_event_names_v2.sql`  
**Purpose:** Normalize all event names to standard format with gender awareness

---

## 📋 Execution Order (Exactly as it runs)

### **STEP 1: Create Backup Tables** (Lines 11-21)

Creates temporary backup tables for rollback safety:

1. **`athlete_events_backup`**
   - Backs up ALL columns from `athlete_events` table
   - ~51 records backed up

2. **`wa_athlete_pbs_backup`**
   - Backs up `id`, `aa_athlete_id`, `discipline` from `wa_athlete_pbs`
   - ~203 records backed up

3. **`wa_rf_athlete_results_backup`**
   - Backs up `id`, `aa_athlete_id`, `discipline` from `wa_rf_athlete_results`
   - ~1000+ records backed up

4. **`wa_athlete_profiles_backup`**
   - Backs up `aa_athlete_id`, `reliance_events` from `wa_athlete_profiles`
   - 42 records backed up

**Result:** All data safely backed up in temporary tables

---

### **STEP 2: UPDATE `athlete_events` Table** (Lines 27-58)

Updates event names in `athlete_events` - **NO gender lookup needed** (already has correct gender prefix).

**Updates (in order):**

1. `Men's 100m` → `Men's 100m` (fixes apostrophe only)
2. `Women's 100m` → `Women's 100m`
3. `Men's 200m` → `Men's 200m`
4. `Women's 200m` → `Women's 200m`
5. `Women's 400m` → `Women's 400m`
6. `Men's 110m Hurdles` → `Men's 110m Hurdles`
7. `Women's 100m Hurdles` → `Women's 100m Hurdles`
8. `Women's 400m Hurdles` → `Women's 400m Hurdles`
9. `Men's 400m Hurdles` → `Men's 400m Hurdles`
10. `Men's 800m` → `Men's 800m`
11. `Women's 800m` → `Women's 800m`
12. `Women's 1500m` → `Women's 1500m`
13. `Men's 5000m` → `Men's 5000m`
14. `Women's 5000m` → `Women's 5000m`
15. `Men's 10000m` → `Men's 10000m`
16. `Women's 10000m` → `Women's 10000m`
17. `Men's Marathon` → `Men's Marathon`
18. `Women's Race Walk` → `Women's Race Walk`
19. `Men's Long Jump` → `Men's Long Jump`
20. `Women's Long Jump` → `Women's Long Jump`
21. `Men's High Jump` → `Men's High Jump`
22. `Men's Pole Vault` → `Men's Pole Vault`
23. `Men's Hammer Throw` → `Men's Hammer Throw`
24. `Women's Hammer Throw` → `Women's Hammer Throw`
25. `Men's Javelin Throw` → `Men's Javelin Throw`
26. `Men's Discus Throw` → `Men's Discus Throw`
27. `Women's Shot Put` → `Women's Shot Put`
28. `Men's Decathlon` → `Men's Decathlon`

**Records Affected:** ~51 records  
**Tables Updated:** 1 (`athlete_events`)

---

### **STEP 3: UPDATE `wa_athlete_pbs` Table** (Lines 64-434)

**⚠️ GENDER-AWARE UPDATES** - Joins to `wa_athlete_profiles` to check athlete gender

#### 3.1 Sprint Events (Lines 66-109)

Updates for each athlete based on their gender:

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `60 Metres` | `Men's 60m` | `Women's 60m` |
| `100 Metres` | `Men's 100m` | `Women's 100m` |
| `200 Metres` | `Men's 200m` | `Women's 200m` |
| `400 Metres` | `Men's 400m` | `Women's 400m` |

**How it works:**
```sql
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 100m'
    WHEN prof.gender = 'F' THEN 'Women''s 100m'
    ELSE pb.discipline  -- unchanged if gender unknown
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id  -- JOIN on athlete
AND pb.discipline = '100 Metres'  -- Only update this old name
```

#### 3.2 Hurdles (Lines 111-159)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `60 Metres Hurdles` | `Men's 60m Hurdles` | `Women's 60m Hurdles` |
| `100 Metres Hurdles` | — | `Women's 100m Hurdles` |
| `100 Metres Hurdles (76.2cm)` | — | `Women's 100m Hurdles (76.2cm)` |
| `110 Metres Hurdles` | `Men's 110m Hurdles` | — |
| `110 Metres Hurdles (99.0cm)` | `Men's 110m Hurdles (99.0cm)` | — |
| `110 Metres Hurdles (91.4cm)` | `Men's 110m Hurdles (91.4cm)` | — |
| `400 Metres Hurdles` | `Men's 400m Hurdles` | `Women's 400m Hurdles` |

#### 3.3 Middle & Long Distance (Lines 161-226)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `800 Metres` | `Men's 800m` | `Women's 800m` |
| `1500 Metres` | `Men's 1500m` | `Women's 1500m` |
| `3000 Metres` | `Men's 3000m` | `Women's 3000m` |
| `5000 Metres` | `Men's 5000m` | `Women's 5000m` |
| `10,000 Metres` | `Men's 10000m` | `Women's 10000m` |
| `2000 Metres` | `Men's 2000m` | `Women's 2000m` |

#### 3.4 Road Events (Lines 228-264)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `Marathon` | `Men's Marathon` | `Women's Marathon` |
| `Half Marathon` | `Men's Half Marathon` | `Women's Half Marathon` |
| `25 Kilometres Road` | `Men's 25km Road` | `Women's 25km Road` |

#### 3.5 Race Walk (Lines 266-320)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `10 Kilometres Race Walk` or `10,000 Metres Race Walk` | `Men's 10km Race Walk` | `Women's 10km Race Walk` |
| `20 Kilometres Race Walk` or `20,000 Metres Race Walk` | `Men's 20km Race Walk` | `Women's 20km Race Walk` |
| `35 Kilometres Race Walk` | `Men's 35km Race Walk` | `Women's 35km Race Walk` |
| `Half Marathon Race Walk` | `Men's Half Marathon Race Walk` | `Women's Half Marathon Race Walk` |
| `Marathon Race Walk` | `Men's Marathon Race Walk` | `Women's Marathon Race Walk` |

#### 3.6 Jumps (Lines 322-368)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `High Jump` | `Men's High Jump` | `Women's High Jump` |
| `Long Jump` | `Men's Long Jump` | `Women's Long Jump` |
| `Triple Jump` | `Men's Triple Jump` | `Women's Triple Jump` |
| `Pole Vault` | `Men's Pole Vault` | `Women's Pole Vault` |

#### 3.7 Throws - Shot Put (Lines 370-388)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `Shot Put` | `Men's Shot Put` | `Women's Shot Put` |
| `Shot Put (3kg)` | `Men's Shot Put (3kg)` | `Women's Shot Put (3kg)` |

#### 3.8 Throws - Discus (Lines 390-416)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `Discus Throw` | `Men's Discus Throw` | `Women's Discus Throw` |
| `Discus Throw (1,75kg)` or `Discus Throw (1.75kg)` | `Men's Discus Throw (1.75kg)` | `Women's Discus Throw (1.75kg)` |
| `Discus Throw (1,5kg)` or `Discus Throw (1.5kg)` | `Men's Discus Throw (1.5kg)` | `Women's Discus Throw (1.5kg)` |

#### 3.9 Throws - Hammer (Lines 418-454)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `Hammer Throw` | `Men's Hammer Throw` | `Women's Hammer Throw` |
| `Hammer Throw (6kg)` | `Men's Hammer Throw (6kg)` | `Women's Hammer Throw (6kg)` |
| `Hammer Throw (5kg)` | `Men's Hammer Throw (5kg)` | `Women's Hammer Throw (5kg)` |
| `Hammer Throw (3kg)` | `Men's Hammer Throw (3kg)` | `Women's Hammer Throw (3kg)` |

#### 3.10 Throws - Javelin (Lines 456-478)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `Javelin Throw` | `Men's Javelin Throw` | `Women's Javelin Throw` |
| `Javelin Throw (700g)` | `Men's Javelin Throw (700g)` | `Women's Javelin Throw (700g)` |

#### 3.11 Throws - Weight (Lines 480-492)

| Old Event Name | Male Athletes → | Female Athletes → |
|----------------|----------------|-------------------|
| `Weight Throw` | `Men's Weight Throw` | `Women's Weight Throw` |

#### 3.12 Combined Events (Lines 494-496)

**Gender-specific (no lookup needed):**

| Old Event Name | New Event Name |
|----------------|----------------|
| `Decathlon` | `Men's Decathlon` |
| `Heptathlon` | `Women's Heptathlon` |

#### 3.13 Relays (Lines 498-502)

**Gender encoded in event (no lookup needed):**

| Old Event Name | New Event Name |
|----------------|----------------|
| `4x100 Metres Relay` | `Men's 4x100m Relay` |
| `4x100 Metres Relay Mixed` | `Mixed 4x100m Relay` |
| `4x400 Metres Relay` | `Men's 4x400m Relay` |
| `4x400 Metres Relay Mixed` | `Mixed 4x400m Relay` |

**Records Affected:** ~203 personal best records  
**Tables Updated:** 1 (`wa_athlete_pbs`)  
**Joins Required:** Yes - joins to `wa_athlete_profiles` for gender

---

### **STEP 4: UPDATE `wa_rf_athlete_results` Table** (Lines 508-780)

**⚠️ GENDER-AWARE UPDATES** - Same logic as Step 3, but for results table

Applies the **exact same transformations** as Step 3, but to competition results instead of personal bests.

#### Updates (in order):

1. **Sprint Events** (60m, 100m, 200m, 400m, 2000m)
2. **Hurdles** (60m, 100m, 110m, 400m Hurdles)
3. **Middle/Long Distance** (800m, 1500m, 3000m, 5000m, 10000m)
4. **Road Events** (10km Road, Half Marathon, 25km Road)
5. **Race Walk** (3km, 5km, 10km, 20km, 35km Race Walk)
6. **Jumps** (High Jump, Long Jump, Triple Jump, Pole Vault)
7. **Throws - Shot Put**
8. **Throws - Discus**
9. **Throws - Hammer**
10. **Throws - Javelin**
11. **Throws - Weight**
12. **Combined Events** (Decathlon, Heptathlon)
13. **Relays** (4x100m, 4x400m, Mixed)
14. **Cross Country** (Cross Country, Cross Country Senior Race)
15. **Short Track** (200m, 800m, 5000m Short Track)

**Records Affected:** ~1000+ competition results  
**Tables Updated:** 1 (`wa_rf_athlete_results`)  
**Joins Required:** Yes - joins to `wa_athlete_profiles` for gender

---

### **STEP 5: Verification Queries** (Lines 786-810)

Runs validation to confirm migration succeeded:

1. **Count distinct events** in each table:
   ```sql
   RAISE NOTICE 'athlete_events distinct events: %'
   RAISE NOTICE 'wa_athlete_pbs distinct disciplines: %'
   RAISE NOTICE 'wa_rf_athlete_results distinct disciplines: %'
   ```

2. **Verify gender assignments:**
   ```sql
   SELECT p.gender, pb.discipline, COUNT(*) as count
   FROM wa_athlete_pbs pb
   JOIN wa_athlete_profiles p ON pb.aa_athlete_id = p.aa_athlete_id
   WHERE pb.discipline LIKE '%''s%'
   GROUP BY p.gender, pb.discipline
   ```
   
   Shows first 20 examples of gender + event combinations to verify correctness

**Output:** Logs to console showing counts and sample data

---

## 📊 Summary of Changes

| Table | Records Updated | Gender Lookup? | Backup Created? |
|-------|----------------|----------------|-----------------|
| `athlete_events` | ~51 | No (already correct) | ✅ Yes |
| `wa_athlete_pbs` | ~203 | ✅ Yes | ✅ Yes |
| `wa_rf_athlete_results` | ~1000+ | ✅ Yes | ✅ Yes |
| `wa_athlete_profiles` | 0 | N/A (source table) | ✅ Yes |

## 🎯 Key Points

### Gender Lookup Logic:
- **Joins to** `wa_athlete_profiles.gender` column
- **Male athletes** (`gender = 'M'`) → `Men's EventName`
- **Female athletes** (`gender = 'F'`) → `Women's EventName`
- **Unknown gender** → Keeps original value unchanged

### Update Pattern:
Every gender-aware update follows this pattern:
```sql
UPDATE [table] t
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s [Event]'
    WHEN prof.gender = 'F' THEN 'Women''s [Event]'
    ELSE t.discipline
END
FROM wa_athlete_profiles prof
WHERE t.aa_athlete_id = prof.aa_athlete_id
AND t.discipline = '[Old Event Name]'
```

### Safety Features:
1. **Temp backups created first** (Step 1)
2. **Rollback script included** (commented at end of file)
3. **ELSE clause** preserves original if gender unknown
4. **Verification queries** confirm success

---

## ⚠️ Important Notes

1. **Execution is linear** - runs top to bottom in file order
2. **No concurrent updates** - PostgreSQL handles locking
3. **Temp tables persist** during session for rollback
4. **All 42 athletes** in `wa_athlete_profiles` are used for lookups
5. **No data deleted** - only discipline/event_name columns updated

## 🔄 Rollback Process

If something goes wrong, the commented rollback script at the end can restore all data from the backup tables.

---

**Total Execution Time:** ~5-10 seconds (depends on table sizes)  
**Total Records Modified:** ~1,250+ across all tables
