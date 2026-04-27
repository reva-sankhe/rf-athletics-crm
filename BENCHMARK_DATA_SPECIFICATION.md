# Event Benchmarks Data Collection Specification

**For:** Claude AI Assistant  
**Purpose:** Research and provide real competition benchmark data  
**Date:** April 27, 2026  
**Database:** Supabase `event_benchmarks` table

---

## Instructions for Claude

Please research and provide benchmark data for the athletics events listed below. For each event, find the most recent/relevant data from official sources.

### Data Sources (Priority Order):
1. **World Athletics** (worldathletics.org) - Official records and standards
2. **Olympic Games** (olympics.com) - Medal results from Paris 2024 or Tokyo 2020
3. **Asian Games** (asiad2023.en.cn) - Results from Hangzhou 2023 or Jakarta 2018
4. **Commonwealth Games** (birmingham2022.com) - Results from Birmingham 2022 or Gold Coast 2018
5. **IOC/NOC websites** - Qualification standards

### Data Quality Guidelines:
- Use **most recent** competition results available
- **Verify ages** from athlete birth dates (calculate age at time of competition)
- Use **standardized formats** for marks (see below)
- If data is unavailable for a field, leave it as `NULL` in the SQL

---

## Events Requiring Benchmark Data

Based on the current Reliance Foundation athlete roster, we need data for the following **28 unique events**:

### Track Events - Sprints (5 events)
1. **Men's 100m**
2. **Men's 200m**
3. **Women's 100m**
4. **Women's 200m**
5. **Women's 400m**

### Track Events - Hurdles (4 events)
6. **Men's 110m Hurdles**
7. **Men's 400m Hurdles**
8. **Women's 100m Hurdles**
9. **Women's 400m Hurdles**

### Track Events - Middle/Long Distance (6 events)
10. **Men's 800m**
11. **Men's 5000m**
12. **Men's 10000m**
13. **Women's 800m**
14. **Women's 1500m**
15. **Women's 5000m**
16. **Women's 10000m**

### Road Events (2 events)
17. **Men's Marathon**
18. **Women's Marathon**

### Race Walk (1 event)
19. **Women's Race Walk** (typically 20km or 35km - use most common distance)

### Jumps (4 events)
20. **Men's Long Jump**
21. **Men's High Jump**
22. **Men's Pole Vault**
23. **Women's Long Jump**

### Throws (5 events)
24. **Men's Discus Throw**
25. **Men's Hammer Throw**
26. **Men's Javelin Throw**
27. **Women's Hammer Throw**
28. **Women's Shot Put**

### Combined Events (1 event)
29. **Men's Decathlon**

---

## Data Fields Required for Each Event

For each event above, please provide the following data points:

### 1. Qualification Standards
- **Asian Games Qualification Standard** (Entry/B standard)
- **Commonwealth Games Qualification Standard** (Entry/B standard)

### 2. Olympic Games Medal Results (Most Recent: Paris 2024 or Tokyo 2020)
- **Gold Medalist:** Performance + Age at competition
- **Silver Medalist:** Performance + Age at competition  
- **Bronze Medalist:** Performance + Age at competition

### 3. Asian Games Medal Results (Most Recent: Hangzhou 2023 or Jakarta 2018)
- **Gold Medalist:** Performance + Age at competition
- **Silver Medalist:** Performance + Age at competition
- **Bronze Medalist:** Performance + Age at competition

### 4. Commonwealth Games Medal Results (Most Recent: Birmingham 2022 or Gold Coast 2018)
- **Gold Medalist:** Performance + Age at competition
- **Silver Medalist:** Performance + Age at competition
- **Bronze Medalist:** Performance + Age at competition

---

## Performance Mark Format Standards

### Track Events (Running)
- **Format:** `"10.45s"`, `"1:43.21"`, `"13:05.23"`
- **Examples:**
  - 100m: `"9.79s"`
  - 400m: `"43.03s"`
  - 800m: `"1:44.25"` (use colon for minutes)
  - 5000m: `"12:57.66"`
  - Marathon: `"2:05:17"` (hours:minutes:seconds)

### Field Events (Throws/Jumps)
- **Format:** `"8.95m"`, `"2.39m"`, `"6.10m"`
- **Always include:** Number + "m"
- **Examples:**
  - Long Jump: `"8.90m"`
  - High Jump: `"2.37m"`
  - Javelin: `"90.57m"`
  - Shot Put: `"23.37m"`

### Race Walk
- **Format:** Same as track events with time
- **Example:** `"1:25:16"` for 20km

---

## SQL Output Format

Please provide your research results in **ready-to-execute SQL format** like this:

```sql
-- Event: [EVENT NAME]
-- Data Sources: [List your sources]
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
  updated_by
) VALUES (
  'Women''s 100m Hurdles',
  '12.95s',
  '13.05s',
  '12.26s', 24,
  '12.33s', 28,
  '12.34s', 27,
  '12.72s', 25,
  '12.84s', 24,
  '12.91s', 26,
  '12.78s', 27,
  '12.89s', 24,
  '12.94s', 25,
  'Claude AI'
) ON CONFLICT (event_name) DO UPDATE SET
  asian_games_qual_standard = EXCLUDED.asian_games_qual_standard,
  commonwealth_games_qual_standard = EXCLUDED.commonwealth_games_qual_standard,
  olympic_gold_result = EXCLUDED.olympic_gold_result,
  olympic_gold_age = EXCLUDED.olympic_gold_age,
  olympic_silver_result = EXCLUDED.olympic_silver_result,
  olympic_silver_age = EXCLUDED.olympic_silver_age,
  olympic_bronze_result = EXCLUDED.olympic_bronze_result,
  olympic_bronze_age = EXCLUDED.olympic_bronze_age,
  asian_games_gold_result = EXCLUDED.asian_games_gold_result,
  asian_games_gold_age = EXCLUDED.asian_games_gold_age,
  asian_games_silver_result = EXCLUDED.asian_games_silver_result,
  asian_games_silver_age = EXCLUDED.asian_games_silver_age,
  asian_games_bronze_result = EXCLUDED.asian_games_bronze_result,
  asian_games_bronze_age = EXCLUDED.asian_games_bronze_age,
  cwg_gold_result = EXCLUDED.cwg_gold_result,
  cwg_gold_age = EXCLUDED.cwg_gold_age,
  cwg_silver_result = EXCLUDED.cwg_silver_result,
  cwg_silver_age = EXCLUDED.cwg_silver_age,
  cwg_bronze_result = EXCLUDED.cwg_bronze_result,
  cwg_bronze_age = EXCLUDED.cwg_bronze_age,
  updated_by = EXCLUDED.updated_by;
```

### Important SQL Notes:
- Use `'Women''s'` (double single quotes) to escape apostrophes in event names
- Use `NULL` for missing data (don't include the field or use NULL keyword)
- All SQL statements should use `ON CONFLICT ... DO UPDATE` for safe re-running
- Set `updated_by` to `'Claude AI'` for all entries

---

## Example Complete Entry

Here's a complete example showing all fields populated:

```sql
-- Event: Men's Long Jump
-- Sources: Paris 2024 Olympics, Hangzhou 2023 Asian Games, Birmingham 2022 CWG, World Athletics
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
  updated_by
) VALUES (
  'Men''s Long Jump',
  '8.15m',
  '8.05m',
  '8.36m', 26,
  '8.34m', 28,
  '8.27m', 25,
  '8.48m', 24,
  '8.42m', 26,
  '8.31m', 23,
  '8.35m', 25,
  '8.25m', 27,
  '8.19m', 24,
  'Claude AI'
) ON CONFLICT (event_name) DO UPDATE SET
  asian_games_qual_standard = EXCLUDED.asian_games_qual_standard,
  commonwealth_games_qual_standard = EXCLUDED.commonwealth_games_qual_standard,
  olympic_gold_result = EXCLUDED.olympic_gold_result,
  olympic_gold_age = EXCLUDED.olympic_gold_age,
  olympic_silver_result = EXCLUDED.olympic_silver_result,
  olympic_silver_age = EXCLUDED.olympic_silver_age,
  olympic_bronze_result = EXCLUDED.olympic_bronze_result,
  olympic_bronze_age = EXCLUDED.olympic_bronze_age,
  asian_games_gold_result = EXCLUDED.asian_games_gold_result,
  asian_games_gold_age = EXCLUDED.asian_games_gold_age,
  asian_games_silver_result = EXCLUDED.asian_games_silver_result,
  asian_games_silver_age = EXCLUDED.asian_games_silver_age,
  asian_games_bronze_result = EXCLUDED.asian_games_bronze_result,
  asian_games_bronze_age = EXCLUDED.asian_games_bronze_age,
  cwg_gold_result = EXCLUDED.cwg_gold_result,
  cwg_gold_age = EXCLUDED.cwg_gold_age,
  cwg_silver_result = EXCLUDED.cwg_silver_result,
  cwg_silver_age = EXCLUDED.cwg_silver_age,
  cwg_bronze_result = EXCLUDED.cwg_bronze_result,
  cwg_bronze_age = EXCLUDED.cwg_bronze_age,
  updated_by = EXCLUDED.updated_by;
```

---

## Output Format

Please organize your response as:

1. **Introduction** - Brief summary of your methodology
2. **SQL File** - All 29 events in SQL format (ready to copy-paste into Supabase SQL Editor)
3. **Data Quality Notes** - Any events where data was unavailable or uncertain
4. **Sources Used** - List of all websites/sources referenced

---

## Validation Checklist

Before submitting, please verify:
- ✅ All 29 events are included
- ✅ Event names exactly match the list above (including capitalization and apostrophes)
- ✅ Performance marks use correct format (seconds with "s", meters with "m", time with ":")
- ✅ Ages are realistic (typically 18-35 for elite athletes)
- ✅ SQL syntax is correct (test in a SQL validator if possible)
- ✅ `'Women''s'` and `'Men''s'` use double single quotes for escaping
- ✅ All INSERT statements include the `ON CONFLICT` clause
- ✅ Sources are documented

---

## Priority Events

If time is limited, prioritize these events (current RF athlete focus):
1. Women's 100m Hurdles (3 athletes)
2. Men's Javelin Throw (4 athletes)
3. Men's Long Jump (4 athletes)
4. Women's Long Jump (2 athletes)
5. Men's 100m (5 athletes)

---

## Questions?

If you encounter any issues:
- **Event not held at a competition:** Use NULL for that competition's data
- **Can't find qualification standards:** Check World Athletics Entry Standards
- **Uncertain about age calculation:** Use birth year and competition year
- **Format unclear:** Follow the examples exactly

---

**Ready to Research?** 

Please provide all 29 events in SQL format, following the structure above. The output should be a single, complete SQL file that can be copied directly into Supabase SQL Editor and executed successfully.

Good luck, Claude! 🏃‍♂️🏃‍♀️
