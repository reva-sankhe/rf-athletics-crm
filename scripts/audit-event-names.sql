-- SQL Script to Audit All Event Names Across Tables
-- This helps identify inconsistencies and variations in event naming

-- ============================================================
-- EXTRACT ALL UNIQUE EVENT NAMES FROM ALL TABLES
-- ============================================================

-- 1. Events from athlete_events table
SELECT DISTINCT 
    'athlete_events' as source_table,
    event_name as event_name,
    COUNT(*) as usage_count
FROM athlete_events
GROUP BY event_name
ORDER BY usage_count DESC;

-- 2. Disciplines from wa_athlete_pbs (Personal Bests)
SELECT DISTINCT 
    'wa_athlete_pbs' as source_table,
    discipline as event_name,
    COUNT(*) as usage_count
FROM wa_athlete_pbs
WHERE discipline IS NOT NULL
GROUP BY discipline
ORDER BY usage_count DESC;

-- 3. Disciplines from wa_athlete_season_bests
SELECT DISTINCT 
    'wa_athlete_season_bests' as source_table,
    discipline as event_name,
    COUNT(*) as usage_count
FROM wa_athlete_season_bests
WHERE discipline IS NOT NULL
GROUP BY discipline
ORDER BY usage_count DESC;

-- 4. Disciplines from wa_rf_athlete_results
SELECT DISTINCT 
    'wa_rf_athlete_results' as source_table,
    discipline as event_name,
    COUNT(*) as usage_count
FROM wa_rf_athlete_results
WHERE discipline IS NOT NULL
GROUP BY discipline
ORDER BY usage_count DESC;

-- 5. Events from reliance_events (comma-separated in profiles)
WITH events_split AS (
    SELECT 
        TRIM(unnest(string_to_array(reliance_events, ','))) as event_name
    FROM wa_athlete_profiles
    WHERE reliance_events IS NOT NULL AND reliance_events != ''
)
SELECT DISTINCT 
    'wa_athlete_profiles.reliance_events' as source_table,
    event_name,
    COUNT(*) as usage_count
FROM events_split
WHERE event_name != ''
GROUP BY event_name
ORDER BY usage_count DESC;

-- ============================================================
-- CONSOLIDATED VIEW: ALL UNIQUE EVENT NAMES
-- ============================================================

WITH all_events AS (
    -- From athlete_events
    SELECT event_name FROM athlete_events
    UNION ALL
    -- From wa_athlete_pbs
    SELECT discipline as event_name FROM wa_athlete_pbs WHERE discipline IS NOT NULL
    UNION ALL
    -- From wa_athlete_season_bests
    SELECT discipline as event_name FROM wa_athlete_season_bests WHERE discipline IS NOT NULL
    UNION ALL
    -- From wa_rf_athlete_results
    SELECT discipline as event_name FROM wa_rf_athlete_results WHERE discipline IS NOT NULL
    UNION ALL
    -- From wa_athlete_profiles.reliance_events
    SELECT TRIM(unnest(string_to_array(reliance_events, ','))) as event_name
    FROM wa_athlete_profiles
    WHERE reliance_events IS NOT NULL AND reliance_events != ''
)
SELECT 
    event_name,
    COUNT(*) as total_usage,
    -- Try to categorize
    CASE 
        WHEN event_name ~* 'hurdles' THEN 'Hurdles'
        WHEN event_name ~* '(100m|200m|400m|100 |200 |400 )' AND event_name !~* 'hurdles' THEN 'Sprint'
        WHEN event_name ~* '(800m|1500m|800 |1500 )' THEN 'Middle Distance'
        WHEN event_name ~* '(3000m|5000m|10000m|3000 |5000 |10000 )' THEN 'Long Distance'
        WHEN event_name ~* 'jump' THEN 'Jumps'
        WHEN event_name ~* '(throw|shot|javelin|discus|hammer)' THEN 'Throws'
        WHEN event_name ~* 'walk' THEN 'Race Walk'
        WHEN event_name ~* 'relay' THEN 'Relay'
        ELSE 'Other'
    END as category
FROM all_events
WHERE event_name IS NOT NULL AND event_name != ''
GROUP BY event_name
ORDER BY category, event_name;

-- ============================================================
-- FIND LIKELY DUPLICATES (Same event, different formatting)
-- ============================================================

WITH all_events AS (
    SELECT event_name FROM athlete_events
    UNION ALL
    SELECT discipline FROM wa_athlete_pbs WHERE discipline IS NOT NULL
    UNION ALL
    SELECT discipline FROM wa_athlete_season_bests WHERE discipline IS NOT NULL
    UNION ALL
    SELECT discipline FROM wa_rf_athlete_results WHERE discipline IS NOT NULL
    UNION ALL
    SELECT TRIM(unnest(string_to_array(reliance_events, ','))) 
    FROM wa_athlete_profiles
    WHERE reliance_events IS NOT NULL AND reliance_events != ''
),
normalized AS (
    SELECT 
        event_name,
        -- Normalize for comparison
        LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(event_name, 'Men''?s?\s*', '', 'gi'),
                'Women''?s?\s*', '', 'gi'
            )
        ) as normalized_name
    FROM all_events
    WHERE event_name IS NOT NULL AND event_name != ''
)
SELECT 
    normalized_name,
    array_agg(DISTINCT event_name ORDER BY event_name) as variations,
    COUNT(DISTINCT event_name) as variation_count
FROM normalized
GROUP BY normalized_name
HAVING COUNT(DISTINCT event_name) > 1
ORDER BY variation_count DESC, normalized_name;

-- ============================================================
-- EVENT USAGE BY ATHLETE (Which athletes have which events)
-- ============================================================

SELECT 
    p.aa_athlete_id,
    p.reliance_name as athlete_name,
    p.gender,
    array_agg(DISTINCT ae.event_name ORDER BY ae.event_name) as athlete_events,
    COUNT(DISTINCT ae.event_name) as event_count,
    (SELECT event_name FROM athlete_events WHERE aa_athlete_id = p.aa_athlete_id AND is_main_event = true LIMIT 1) as main_event
FROM wa_athlete_profiles p
LEFT JOIN athlete_events ae ON p.aa_athlete_id = ae.aa_athlete_id
GROUP BY p.aa_athlete_id, p.reliance_name, p.gender
ORDER BY p.reliance_name;
