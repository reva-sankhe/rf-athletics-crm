-- SQL Script to Identify and Fix Duplicate Personal Bests
-- This script finds duplicate PB entries for the same athlete and discipline

-- ============================================================
-- STEP 1: IDENTIFY DUPLICATES (Run this first to review)
-- ============================================================

-- Find all duplicate personal bests
SELECT 
    p.aa_athlete_id,
    prof.reliance_name as athlete_name,
    p.discipline,
    COUNT(*) as duplicate_count,
    array_agg(p.id) as pb_ids,
    array_agg(p.mark) as marks,
    array_agg(p.date) as dates
FROM wa_athlete_pbs p
JOIN wa_athlete_profiles prof ON p.aa_athlete_id = prof.aa_athlete_id
GROUP BY p.aa_athlete_id, prof.reliance_name, p.discipline
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, athlete_name;

-- ============================================================
-- STEP 2: DETAILED VIEW OF DUPLICATES
-- ============================================================

-- Show full details of duplicate records
WITH duplicates AS (
    SELECT 
        aa_athlete_id,
        discipline,
        COUNT(*) as cnt
    FROM wa_athlete_pbs
    GROUP BY aa_athlete_id, discipline
    HAVING COUNT(*) > 1
)
SELECT 
    p.id,
    p.aa_athlete_id,
    prof.reliance_name as athlete_name,
    p.discipline,
    p.mark,
    p.wind,
    p.venue,
    p.date
FROM wa_athlete_pbs p
JOIN duplicates d ON p.aa_athlete_id = d.aa_athlete_id AND p.discipline = d.discipline
JOIN wa_athlete_profiles prof ON p.aa_athlete_id = prof.aa_athlete_id
ORDER BY prof.reliance_name, p.discipline, p.mark;

-- ============================================================
-- STEP 3: IDENTIFY WHICH RECORDS TO KEEP (Best Performance)
-- ============================================================

-- For running events (time-based, lower is better)
-- This identifies the BEST record to KEEP for each athlete/discipline
WITH duplicates AS (
    SELECT 
        aa_athlete_id,
        discipline,
        COUNT(*) as cnt
    FROM wa_athlete_pbs
    GROUP BY aa_athlete_id, discipline
    HAVING COUNT(*) > 1
),
time_based_events AS (
    SELECT p.*,
        prof.reliance_name,
        ROW_NUMBER() OVER (
            PARTITION BY p.aa_athlete_id, p.discipline 
            ORDER BY p.mark ASC  -- Lower time is better
        ) as rank
    FROM wa_athlete_pbs p
    JOIN duplicates d ON p.aa_athlete_id = d.aa_athlete_id AND p.discipline = d.discipline
    JOIN wa_athlete_profiles prof ON p.aa_athlete_id = prof.aa_athlete_id
    WHERE p.discipline ~* '(m$|hurdles|relay|walk)'  -- Time-based events
),
distance_based_events AS (
    SELECT p.*,
        prof.reliance_name,
        ROW_NUMBER() OVER (
            PARTITION BY p.aa_athlete_id, p.discipline 
            ORDER BY p.mark DESC  -- Higher distance is better
        ) as rank
    FROM wa_athlete_pbs p
    JOIN duplicates d ON p.aa_athlete_id = d.aa_athlete_id AND p.discipline = d.discipline
    JOIN wa_athlete_profiles prof ON p.aa_athlete_id = prof.aa_athlete_id
    WHERE p.discipline ~* '(throw|jump)'  -- Distance-based events
)
-- Records to KEEP (rank = 1 means best performance)
SELECT 'KEEP' as action, id, reliance_name, discipline, mark, date
FROM (
    SELECT * FROM time_based_events WHERE rank = 1
    UNION ALL
    SELECT * FROM distance_based_events WHERE rank = 1
) best_records
ORDER BY reliance_name, discipline;

-- ============================================================
-- STEP 4: IDENTIFY RECORDS TO DELETE
-- ============================================================

-- Records to DELETE (rank > 1 means not the best)
WITH duplicates AS (
    SELECT 
        aa_athlete_id,
        discipline,
        COUNT(*) as cnt
    FROM wa_athlete_pbs
    GROUP BY aa_athlete_id, discipline
    HAVING COUNT(*) > 1
),
time_based_events AS (
    SELECT p.*,
        prof.reliance_name,
        ROW_NUMBER() OVER (
            PARTITION BY p.aa_athlete_id, p.discipline 
            ORDER BY p.mark ASC
        ) as rank
    FROM wa_athlete_pbs p
    JOIN duplicates d ON p.aa_athlete_id = d.aa_athlete_id AND p.discipline = d.discipline
    JOIN wa_athlete_profiles prof ON p.aa_athlete_id = prof.aa_athlete_id
    WHERE p.discipline ~* '(m$|hurdles|relay|walk)'
),
distance_based_events AS (
    SELECT p.*,
        prof.reliance_name,
        ROW_NUMBER() OVER (
            PARTITION BY p.aa_athlete_id, p.discipline 
            ORDER BY p.mark DESC
        ) as rank
    FROM wa_athlete_pbs p
    JOIN duplicates d ON p.aa_athlete_id = d.aa_athlete_id AND p.discipline = d.discipline
    JOIN wa_athlete_profiles prof ON p.aa_athlete_id = prof.aa_athlete_id
    WHERE p.discipline ~* '(throw|jump)'
)
-- Records to DELETE
SELECT 'DELETE' as action, id, reliance_name, discipline, mark, date
FROM (
    SELECT * FROM time_based_events WHERE rank > 1
    UNION ALL
    SELECT * FROM distance_based_events WHERE rank > 1
) duplicate_records
ORDER BY reliance_name, discipline;

-- ============================================================
-- STEP 5: DELETE DUPLICATES (Run AFTER reviewing above queries)
-- ============================================================
-- CAUTION: This will permanently delete records!
-- UNCOMMENT ONLY AFTER VERIFYING THE RECORDS TO DELETE

/*
WITH duplicates AS (
    SELECT 
        aa_athlete_id,
        discipline,
        COUNT(*) as cnt
    FROM wa_athlete_pbs
    GROUP BY aa_athlete_id, discipline
    HAVING COUNT(*) > 1
),
time_based_events AS (
    SELECT p.id,
        ROW_NUMBER() OVER (
            PARTITION BY p.aa_athlete_id, p.discipline 
            ORDER BY p.mark ASC
        ) as rank
    FROM wa_athlete_pbs p
    JOIN duplicates d ON p.aa_athlete_id = d.aa_athlete_id AND p.discipline = d.discipline
    WHERE p.discipline ~* '(m$|hurdles|relay|walk)'
),
distance_based_events AS (
    SELECT p.id,
        ROW_NUMBER() OVER (
            PARTITION BY p.aa_athlete_id, p.discipline 
            ORDER BY p.mark DESC
        ) as rank
    FROM wa_athlete_pbs p
    JOIN duplicates d ON p.aa_athlete_id = d.aa_athlete_id AND p.discipline = d.discipline
    WHERE p.discipline ~* '(throw|jump)'
),
records_to_delete AS (
    SELECT id FROM time_based_events WHERE rank > 1
    UNION ALL
    SELECT id FROM distance_based_events WHERE rank > 1
)
DELETE FROM wa_athlete_pbs
WHERE id IN (SELECT id FROM records_to_delete);

-- Verify deletion
SELECT 
    aa_athlete_id,
    discipline,
    COUNT(*) as count
FROM wa_athlete_pbs
GROUP BY aa_athlete_id, discipline
HAVING COUNT(*) > 1;
*/

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- Run this after deletion to ensure no duplicates remain
SELECT 
    'Total PBs' as metric,
    COUNT(*) as count
FROM wa_athlete_pbs
UNION ALL
SELECT 
    'Athletes with PBs' as metric,
    COUNT(DISTINCT aa_athlete_id) as count
FROM wa_athlete_pbs
UNION ALL
SELECT 
    'Remaining Duplicates' as metric,
    COUNT(*) as count
FROM (
    SELECT aa_athlete_id, discipline
    FROM wa_athlete_pbs
    GROUP BY aa_athlete_id, discipline
    HAVING COUNT(*) > 1
) dup;
