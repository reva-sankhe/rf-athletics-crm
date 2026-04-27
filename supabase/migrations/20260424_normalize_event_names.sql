-- Migration: Normalize Event Names to Standard Format
-- Date: 2026-04-24
-- Description: Update all event names across all tables to use standard format
-- Standard Format: Gender's Distance/Event (e.g., "Men's 100m", "Women's Long Jump")

-- ============================================================
-- STEP 1: Create backup of current event names (for rollback)
-- ============================================================

-- Create temporary backup table for athlete_events
CREATE TEMP TABLE athlete_events_backup AS 
SELECT * FROM athlete_events;

-- Create temporary backup table for wa_athlete_pbs
CREATE TEMP TABLE wa_athlete_pbs_backup AS 
SELECT id, aa_athlete_id, discipline FROM wa_athlete_pbs;

-- Create temporary backup table for wa_rf_athlete_results  
CREATE TEMP TABLE wa_rf_athlete_results_backup AS 
SELECT id, aa_athlete_id, discipline FROM wa_rf_athlete_results;

-- Create temporary backup table for wa_athlete_profiles
CREATE TEMP TABLE wa_athlete_profiles_backup AS 
SELECT aa_athlete_id, reliance_events FROM wa_athlete_profiles;

-- ============================================================
-- STEP 2: UPDATE athlete_events table
-- ============================================================

-- Sprint events
UPDATE athlete_events SET event_name = 'Men's 100m' WHERE event_name = 'Men''s 100m';
UPDATE athlete_events SET event_name = 'Women's 100m' WHERE event_name = 'Women''s 100m';
UPDATE athlete_events SET event_name = 'Men's 200m' WHERE event_name = 'Men''s 200m';
UPDATE athlete_events SET event_name = 'Women's 200m' WHERE event_name = 'Women''s 200m';
UPDATE athlete_events SET event_name = 'Women's 400m' WHERE event_name = 'Women''s 400m';

-- Hurdles
UPDATE athlete_events SET event_name = 'Men's 110m Hurdles' WHERE event_name = 'Men''s 110m Hurdles';
UPDATE athlete_events SET event_name = 'Women's 100m Hurdles' WHERE event_name = 'Women''s 100m Hurdles';
UPDATE athlete_events SET event_name = 'Women's 400m Hurdles' WHERE event_name = 'Women''s 400m Hurdles';
UPDATE athlete_events SET event_name = 'Men's 400m Hurdles' WHERE event_name = 'Men''s 400m Hurdles';

-- Middle & Long distance
UPDATE athlete_events SET event_name = 'Men's 800m' WHERE event_name = 'Men''s 800m';
UPDATE athlete_events SET event_name = 'Women's 800m' WHERE event_name = 'Women''s 800m';
UPDATE athlete_events SET event_name = 'Women's 1500m' WHERE event_name = 'Women''s 1500m';
UPDATE athlete_events SET event_name = 'Men's 5000m' WHERE event_name = 'Men''s 5000m';
UPDATE athlete_events SET event_name = 'Women's 5000m' WHERE event_name = 'Women''s 5000m';
UPDATE athlete_events SET event_name = 'Men's 10000m' WHERE event_name = 'Men''s 10000m';
UPDATE athlete_events SET event_name = 'Women's 10000m' WHERE event_name = 'Women''s 10000m';

-- Road events
UPDATE athlete_events SET event_name = 'Men's Marathon' WHERE event_name = 'Men''s Marathon';

-- Race walk
UPDATE athlete_events SET event_name = 'Women's Race Walk' WHERE event_name = 'Women''s Race Walk';

-- Jumps
UPDATE athlete_events SET event_name = 'Men's Long Jump' WHERE event_name = 'Men''s Long Jump';
UPDATE athlete_events SET event_name = 'Women's Long Jump' WHERE event_name = 'Women''s Long Jump';
UPDATE athlete_events SET event_name = 'Men's High Jump' WHERE event_name = 'Men''s High Jump';
UPDATE athlete_events SET event_name = 'Men's Pole Vault' WHERE event_name = 'Men''s Pole Vault';

-- Throws
UPDATE athlete_events SET event_name = 'Men's Hammer Throw' WHERE event_name = 'Men''s Hammer Throw';
UPDATE athlete_events SET event_name = 'Women's Hammer Throw' WHERE event_name = 'Women''s Hammer Throw';
UPDATE athlete_events SET event_name = 'Men's Javelin Throw' WHERE event_name = 'Men''s Javelin Throw';
UPDATE athlete_events SET event_name = 'Men's Discus Throw' WHERE event_name = 'Men''s Discus Throw';
UPDATE athlete_events SET event_name = 'Women's Shot Put' WHERE event_name = 'Women''s Shot Put';

-- Combined events
UPDATE athlete_events SET event_name = 'Men's Decathlon' WHERE event_name = 'Men''s Decathlon';

-- ============================================================
-- STEP 3: UPDATE wa_athlete_pbs table
-- ============================================================

-- Sprint events
UPDATE wa_athlete_pbs SET discipline = 'Men''s 60m' WHERE discipline = '60 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 100m' WHERE discipline = '100 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 200m' WHERE discipline = '200 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 400m' WHERE discipline = '400 Metres';

-- Hurdles
UPDATE wa_athlete_pbs SET discipline = 'Men''s 60m Hurdles' WHERE discipline = '60 Metres Hurdles';
UPDATE wa_athlete_pbs SET discipline = 'Women''s 100m Hurdles' WHERE discipline = '100 Metres Hurdles';
UPDATE wa_athlete_pbs SET discipline = 'Women''s 100m Hurdles (76.2cm)' WHERE discipline = '100 Metres Hurdles (76.2cm)';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 110m Hurdles' WHERE discipline = '110 Metres Hurdles';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 110m Hurdles (99.0cm)' WHERE discipline = '110 Metres Hurdles (99.0cm)';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 110m Hurdles (91.4cm)' WHERE discipline = '110 Metres Hurdles (91.4cm)';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 400m Hurdles' WHERE discipline = '400 Metres Hurdles';

-- Middle & Long distance
UPDATE wa_athlete_pbs SET discipline = 'Men''s 800m' WHERE discipline = '800 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 1500m' WHERE discipline = '1500 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 3000m' WHERE discipline = '3000 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 5000m' WHERE discipline = '5000 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 10000m' WHERE discipline = '10,000 Metres';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 2000m' WHERE discipline = '2000 Metres';

-- Road events
UPDATE wa_athlete_pbs SET discipline = 'Men''s Marathon' WHERE discipline = 'Marathon';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Half Marathon' WHERE discipline = 'Half Marathon';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 25km Road' WHERE discipline = '25 Kilometres Road';

-- Race walk
UPDATE wa_athlete_pbs SET discipline = 'Men''s 10km Race Walk' WHERE discipline IN ('10 Kilometres Race Walk', '10,000 Metres Race Walk');
UPDATE wa_athlete_pbs SET discipline = 'Men''s 20km Race Walk' WHERE discipline IN ('20 Kilometres Race Walk', '20,000 Metres Race Walk');
UPDATE wa_athlete_pbs SET discipline = 'Men''s 35km Race Walk' WHERE discipline = '35 Kilometres Race Walk';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Half Marathon Race Walk' WHERE discipline = 'Half Marathon Race Walk';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Marathon Race Walk' WHERE discipline = 'Marathon Race Walk';

-- Jumps
UPDATE wa_athlete_pbs SET discipline = 'Men''s High Jump' WHERE discipline = 'High Jump';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Long Jump' WHERE discipline = 'Long Jump';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Triple Jump' WHERE discipline = 'Triple Jump';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Pole Vault' WHERE discipline = 'Pole Vault';

-- Throws - Shot Put
UPDATE wa_athlete_pbs SET discipline = 'Men''s Shot Put' WHERE discipline = 'Shot Put';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Shot Put (3kg)' WHERE discipline = 'Shot Put (3kg)';

-- Throws - Discus
UPDATE wa_athlete_pbs SET discipline = 'Men''s Discus Throw' WHERE discipline = 'Discus Throw';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Discus Throw (1.75kg)' WHERE discipline IN ('Discus Throw (1,75kg)', 'Discus Throw (1.75kg)');
UPDATE wa_athlete_pbs SET discipline = 'Men''s Discus Throw (1.5kg)' WHERE discipline IN ('Discus Throw (1,5kg)', 'Discus Throw (1.5kg)');

-- Throws - Hammer
UPDATE wa_athlete_pbs SET discipline = 'Men''s Hammer Throw' WHERE discipline = 'Hammer Throw';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Hammer Throw (6kg)' WHERE discipline = 'Hammer Throw (6kg)';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Hammer Throw (5kg)' WHERE discipline = 'Hammer Throw (5kg)';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Hammer Throw (3kg)' WHERE discipline = 'Hammer Throw (3kg)';

-- Throws - Javelin
UPDATE wa_athlete_pbs SET discipline = 'Men''s Javelin Throw' WHERE discipline = 'Javelin Throw';
UPDATE wa_athlete_pbs SET discipline = 'Men''s Javelin Throw (700g)' WHERE discipline = 'Javelin Throw (700g)';

-- Throws - Weight
UPDATE wa_athlete_pbs SET discipline = 'Men''s Weight Throw' WHERE discipline = 'Weight Throw';

-- Combined events
UPDATE wa_athlete_pbs SET discipline = 'Men''s Decathlon' WHERE discipline = 'Decathlon';
UPDATE wa_athlete_pbs SET discipline = 'Women''s Heptathlon' WHERE discipline = 'Heptathlon';

-- Relays
UPDATE wa_athlete_pbs SET discipline = 'Men''s 4x100m Relay' WHERE discipline = '4x100 Metres Relay';
UPDATE wa_athlete_pbs SET discipline = 'Mixed 4x100m Relay' WHERE discipline = '4x100 Metres Relay Mixed';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 4x400m Relay' WHERE discipline = '4x400 Metres Relay';
UPDATE wa_athlete_pbs SET discipline = 'Mixed 4x400m Relay' WHERE discipline = '4x400 Metres Relay Mixed';

-- ============================================================
-- STEP 4: UPDATE wa_rf_athlete_results table
-- ============================================================

-- Sprint events
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 60m' WHERE discipline = '60 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 100m' WHERE discipline = '100 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 200m' WHERE discipline = '200 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 400m' WHERE discipline = '400 Metres';

-- Hurdles
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 60m Hurdles' WHERE discipline = '60 Metres Hurdles';
UPDATE wa_rf_athlete_results SET discipline = 'Women''s 100m Hurdles' WHERE discipline = '100 Metres Hurdles';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 110m Hurdles' WHERE discipline = '110 Metres Hurdles';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 400m Hurdles' WHERE discipline = '400 Metres Hurdles';

-- Middle & Long distance
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 800m' WHERE discipline = '800 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 1500m' WHERE discipline = '1500 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 3000m' WHERE discipline = '3000 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 5000m' WHERE discipline = '5000 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 10000m' WHERE discipline = '10,000 Metres';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 2000m' WHERE discipline = '2000 Metres';

-- Road events
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 10km Road' WHERE discipline = '10 Kilometres Road';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Half Marathon' WHERE discipline = 'Half Marathon';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 25km Road' WHERE discipline = '25 Kilometres Road';

-- Race walk
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 3km Race Walk' WHERE discipline = '3000 Metres Race Walk';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 5km Race Walk' WHERE discipline = '5000 Metres Race Walk';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 10km Race Walk' WHERE discipline IN ('10 Kilometres Race Walk', '10,000 Metres Race Walk');
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 20km Race Walk' WHERE discipline IN ('20 Kilometres Race Walk', '20,000 Metres Race Walk');
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 35km Race Walk' WHERE discipline = '35 Kilometres Race Walk';

-- Jumps
UPDATE wa_rf_athlete_results SET discipline = 'Men''s High Jump' WHERE discipline = 'High Jump';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Long Jump' WHERE discipline = 'Long Jump';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Triple Jump' WHERE discipline = 'Triple Jump';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Pole Vault' WHERE discipline = 'Pole Vault';

-- Throws - Shot Put
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Shot Put' WHERE discipline = 'Shot Put';

-- Throws - Discus
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Discus Throw' WHERE discipline = 'Discus Throw';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Discus Throw (1.75kg)' WHERE discipline IN ('Discus Throw (1,75kg)', 'Discus Throw (1.75kg)');

-- Throws - Hammer
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Hammer Throw' WHERE discipline = 'Hammer Throw';

-- Throws - Javelin
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Javelin Throw' WHERE discipline = 'Javelin Throw';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Javelin Throw (700g)' WHERE discipline = 'Javelin Throw (700g)';

-- Throws - Weight
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Weight Throw' WHERE discipline = 'Weight Throw';

-- Combined events
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Decathlon' WHERE discipline = 'Decathlon';
UPDATE wa_rf_athlete_results SET discipline = 'Women''s Heptathlon' WHERE discipline = 'Heptathlon';

-- Relays
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 4x100m Relay' WHERE discipline = '4x100 Metres Relay';
UPDATE wa_rf_athlete_results SET discipline = 'Mixed 4x100m Relay' WHERE discipline = '4x100 Metres Relay Mixed';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 4x400m Relay' WHERE discipline = '4x400 Metres Relay';
UPDATE wa_rf_athlete_results SET discipline = 'Mixed 4x400m Relay' WHERE discipline = '4x400 Metres Relay Mixed';

-- Cross country
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Cross Country' WHERE discipline = 'Cross Country';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Cross Country Senior Race' WHERE discipline = 'Cross Country Senior Race';

-- Special / Short Track
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 200m Short Track' WHERE discipline = '200 Metres Short Track';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 800m Short Track' WHERE discipline = '800 Metres Short Track';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 5000m Short Track' WHERE discipline = '5000 Metres Short Track';

-- ============================================================
-- STEP 5: UPDATE wa_athlete_profiles.reliance_events (comma-separated)
-- ============================================================
-- Note: This field uses comma-separated values, so we need to be careful
-- The athlete_events table is the source of truth, but we'll also update this field

-- Since reliance_events is comma-separated and already matches athlete_events table,
-- and athlete_events was already in standard format, we don't need to update this table.
-- The athlete_events table is the normalized source of truth.

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count distinct event names after migration
DO $$
BEGIN
    RAISE NOTICE 'athlete_events distinct events: %', (SELECT COUNT(DISTINCT event_name) FROM athlete_events);
    RAISE NOTICE 'wa_athlete_pbs distinct disciplines: %', (SELECT COUNT(DISTINCT discipline) FROM wa_athlete_pbs);
    RAISE NOTICE 'wa_rf_athlete_results distinct disciplines: %', (SELECT COUNT(DISTINCT discipline) FROM wa_rf_athlete_results WHERE discipline IS NOT NULL);
END $$;

-- Show sample of new event names
SELECT 'athlete_events' as table_name, event_name, COUNT(*) as count
FROM athlete_events
GROUP BY event_name
ORDER BY count DESC
LIMIT 10;

SELECT 'wa_athlete_pbs' as table_name, discipline as event_name, COUNT(*) as count
FROM wa_athlete_pbs
GROUP BY discipline
ORDER BY count DESC
LIMIT 10;

SELECT 'wa_rf_athlete_results' as table_name, discipline as event_name, COUNT(*) as count
FROM wa_rf_athlete_results
WHERE discipline IS NOT NULL
GROUP BY discipline
ORDER BY count DESC
LIMIT 10;

-- ============================================================
-- ROLLBACK SCRIPT (if needed - keep commented out)
-- ============================================================
/*
-- To rollback this migration, restore from backup tables:

TRUNCATE athlete_events;
INSERT INTO athlete_events SELECT * FROM athlete_events_backup;

UPDATE wa_athlete_pbs p
SET discipline = b.discipline
FROM wa_athlete_pbs_backup b
WHERE p.id = b.id;

UPDATE wa_rf_athlete_results r
SET discipline = b.discipline
FROM wa_rf_athlete_results_backup b
WHERE r.id = b.id;

UPDATE wa_athlete_profiles p
SET reliance_events = b.reliance_events
FROM wa_athlete_profiles_backup b
WHERE p.aa_athlete_id = b.aa_athlete_id;

DROP TABLE athlete_events_backup;
DROP TABLE wa_athlete_pbs_backup;
DROP TABLE wa_rf_athlete_results_backup;
DROP TABLE wa_athlete_profiles_backup;
*/
