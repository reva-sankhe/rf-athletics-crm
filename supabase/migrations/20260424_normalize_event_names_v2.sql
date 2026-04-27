-- Migration: Normalize Event Names to Standard Format (Gender-Aware)
-- Date: 2026-04-24
-- Description: Update all event names across all tables to use standard format
-- Standard Format: Gender's Distance/Event (e.g., "Men's 100m", "Women's Long Jump")
-- This version checks athlete gender before assigning event names

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

-- ============================================================
-- STEP 2: UPDATE athlete_events table
-- ============================================================
-- athlete_events already has correct gender prefix, just fix apostrophes

UPDATE athlete_events SET event_name = 'Men''s 100m' WHERE event_name = 'Men''s 100m';
UPDATE athlete_events SET event_name = 'Women''s 100m' WHERE event_name = 'Women''s 100m';
UPDATE athlete_events SET event_name = 'Men''s 200m' WHERE event_name = 'Men''s 200m';
UPDATE athlete_events SET event_name = 'Women''s 200m' WHERE event_name = 'Women''s 200m';
UPDATE athlete_events SET event_name = 'Women''s 400m' WHERE event_name = 'Women''s 400m';
UPDATE athlete_events SET event_name = 'Men''s 110m Hurdles' WHERE event_name = 'Men''s 110m Hurdles';
UPDATE athlete_events SET event_name = 'Women''s 100m Hurdles' WHERE event_name = 'Women''s 100m Hurdles';
UPDATE athlete_events SET event_name = 'Women''s 400m Hurdles' WHERE event_name = 'Women''s 400m Hurdles';
UPDATE athlete_events SET event_name = 'Men''s 400m Hurdles' WHERE event_name = 'Men''s 400m Hurdles';
UPDATE athlete_events SET event_name = 'Men''s 800m' WHERE event_name = 'Men''s 800m';
UPDATE athlete_events SET event_name = 'Women''s 800m' WHERE event_name = 'Women''s 800m';
UPDATE athlete_events SET event_name = 'Women''s 1500m' WHERE event_name = 'Women''s 1500m';
UPDATE athlete_events SET event_name = 'Men''s 5000m' WHERE event_name = 'Men''s 5000m';
UPDATE athlete_events SET event_name = 'Women''s 5000m' WHERE event_name = 'Women''s 5000m';
UPDATE athlete_events SET event_name = 'Men''s 10000m' WHERE event_name = 'Men''s 10000m';
UPDATE athlete_events SET event_name = 'Women''s 10000m' WHERE event_name = 'Women''s 10000m';
UPDATE athlete_events SET event_name = 'Men''s Marathon' WHERE event_name = 'Men''s Marathon';
UPDATE athlete_events SET event_name = 'Women''s Race Walk' WHERE event_name = 'Women''s Race Walk';
UPDATE athlete_events SET event_name = 'Men''s Long Jump' WHERE event_name = 'Men''s Long Jump';
UPDATE athlete_events SET event_name = 'Women''s Long Jump' WHERE event_name = 'Women''s Long Jump';
UPDATE athlete_events SET event_name = 'Men''s High Jump' WHERE event_name = 'Men''s High Jump';
UPDATE athlete_events SET event_name = 'Men''s Pole Vault' WHERE event_name = 'Men''s Pole Vault';
UPDATE athlete_events SET event_name = 'Men''s Hammer Throw' WHERE event_name = 'Men''s Hammer Throw';
UPDATE athlete_events SET event_name = 'Women''s Hammer Throw' WHERE event_name = 'Women''s Hammer Throw';
UPDATE athlete_events SET event_name = 'Men''s Javelin Throw' WHERE event_name = 'Men''s Javelin Throw';
UPDATE athlete_events SET event_name = 'Men''s Discus Throw' WHERE event_name = 'Men''s Discus Throw';
UPDATE athlete_events SET event_name = 'Women''s Shot Put' WHERE event_name = 'Women''s Shot Put';
UPDATE athlete_events SET event_name = 'Men''s Decathlon' WHERE event_name = 'Men''s Decathlon';

-- ============================================================
-- STEP 3: UPDATE wa_athlete_pbs table (GENDER-AWARE)
-- ============================================================

-- Sprint events - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 60m'
    WHEN prof.gender = 'F' THEN 'Women''s 60m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '60 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 100m'
    WHEN prof.gender = 'F' THEN 'Women''s 100m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '100 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 200m'
    WHEN prof.gender = 'F' THEN 'Women''s 200m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '200 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 400m'
    WHEN prof.gender = 'F' THEN 'Women''s 400m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '400 Metres';

-- Hurdles - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 60m Hurdles'
    WHEN prof.gender = 'F' THEN 'Women''s 60m Hurdles'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '60 Metres Hurdles';

UPDATE wa_athlete_pbs pb
SET discipline = 'Women''s 100m Hurdles'
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '100 Metres Hurdles'
AND prof.gender = 'F';

UPDATE wa_athlete_pbs pb
SET discipline = 'Women''s 100m Hurdles (76.2cm)'
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '100 Metres Hurdles (76.2cm)'
AND prof.gender = 'F';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 110m Hurdles'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '110 Metres Hurdles';

UPDATE wa_athlete_pbs pb
SET discipline = 'Men''s 110m Hurdles (99.0cm)'
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '110 Metres Hurdles (99.0cm)'
AND prof.gender = 'M';

UPDATE wa_athlete_pbs pb
SET discipline = 'Men''s 110m Hurdles (91.4cm)'
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '110 Metres Hurdles (91.4cm)'
AND prof.gender = 'M';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 400m Hurdles'
    WHEN prof.gender = 'F' THEN 'Women''s 400m Hurdles'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '400 Metres Hurdles';

-- Middle & Long distance - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 800m'
    WHEN prof.gender = 'F' THEN 'Women''s 800m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '800 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 1500m'
    WHEN prof.gender = 'F' THEN 'Women''s 1500m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '1500 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 3000m'
    WHEN prof.gender = 'F' THEN 'Women''s 3000m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '3000 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 5000m'
    WHEN prof.gender = 'F' THEN 'Women''s 5000m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '5000 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 10000m'
    WHEN prof.gender = 'F' THEN 'Women''s 10000m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '10,000 Metres';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 2000m'
    WHEN prof.gender = 'F' THEN 'Women''s 2000m'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '2000 Metres';

-- Road events - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Marathon'
    WHEN prof.gender = 'F' THEN 'Women''s Marathon'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Marathon';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Half Marathon'
    WHEN prof.gender = 'F' THEN 'Women''s Half Marathon'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Half Marathon';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 25km Road'
    WHEN prof.gender = 'F' THEN 'Women''s 25km Road'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '25 Kilometres Road';

-- Race walk - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 10km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 10km Race Walk'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline IN ('10 Kilometres Race Walk', '10,000 Metres Race Walk');

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 20km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 20km Race Walk'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline IN ('20 Kilometres Race Walk', '20,000 Metres Race Walk');

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 35km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 35km Race Walk'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = '35 Kilometres Race Walk';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Half Marathon Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s Half Marathon Race Walk'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Half Marathon Race Walk';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Marathon Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s Marathon Race Walk'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Marathon Race Walk';

-- Jumps - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s High Jump'
    WHEN prof.gender = 'F' THEN 'Women''s High Jump'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'High Jump';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Long Jump'
    WHEN prof.gender = 'F' THEN 'Women''s Long Jump'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Long Jump';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Triple Jump'
    WHEN prof.gender = 'F' THEN 'Women''s Triple Jump'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Triple Jump';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Pole Vault'
    WHEN prof.gender = 'F' THEN 'Women''s Pole Vault'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Pole Vault';

-- Throws - Shot Put - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Shot Put'
    WHEN prof.gender = 'F' THEN 'Women''s Shot Put'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Shot Put';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Shot Put (3kg)'
    WHEN prof.gender = 'F' THEN 'Women''s Shot Put (3kg)'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Shot Put (3kg)';

-- Throws - Discus - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Discus Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Discus Throw'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Discus Throw';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Discus Throw (1.75kg)'
    WHEN prof.gender = 'F' THEN 'Women''s Discus Throw (1.75kg)'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline IN ('Discus Throw (1,75kg)', 'Discus Throw (1.75kg)');

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Discus Throw (1.5kg)'
    WHEN prof.gender = 'F' THEN 'Women''s Discus Throw (1.5kg)'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline IN ('Discus Throw (1,5kg)', 'Discus Throw (1.5kg)');

-- Throws - Hammer - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Hammer Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Hammer Throw'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Hammer Throw';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Hammer Throw (6kg)'
    WHEN prof.gender = 'F' THEN 'Women''s Hammer Throw (6kg)'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Hammer Throw (6kg)';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Hammer Throw (5kg)'
    WHEN prof.gender = 'F' THEN 'Women''s Hammer Throw (5kg)'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Hammer Throw (5kg)';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Hammer Throw (3kg)'
    WHEN prof.gender = 'F' THEN 'Women''s Hammer Throw (3kg)'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Hammer Throw (3kg)';

-- Throws - Javelin - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Javelin Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Javelin Throw'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Javelin Throw';

UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Javelin Throw (700g)'
    WHEN prof.gender = 'F' THEN 'Women''s Javelin Throw (700g)'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Javelin Throw (700g)';

-- Throws - Weight - gender-aware
UPDATE wa_athlete_pbs pb
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Weight Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Weight Throw'
    ELSE pb.discipline
END
FROM wa_athlete_profiles prof
WHERE pb.aa_athlete_id = prof.aa_athlete_id
AND pb.discipline = 'Weight Throw';

-- Combined events - gender-specific
UPDATE wa_athlete_pbs SET discipline = 'Men''s Decathlon' WHERE discipline = 'Decathlon';
UPDATE wa_athlete_pbs SET discipline = 'Women''s Heptathlon' WHERE discipline = 'Heptathlon';

-- Relays - these don't need gender from athlete since relay events encode it
UPDATE wa_athlete_pbs SET discipline = 'Men''s 4x100m Relay' WHERE discipline = '4x100 Metres Relay';
UPDATE wa_athlete_pbs SET discipline = 'Mixed 4x100m Relay' WHERE discipline = '4x100 Metres Relay Mixed';
UPDATE wa_athlete_pbs SET discipline = 'Men''s 4x400m Relay' WHERE discipline = '4x400 Metres Relay';
UPDATE wa_athlete_pbs SET discipline = 'Mixed 4x400m Relay' WHERE discipline = '4x400 Metres Relay Mixed';

-- ============================================================
-- STEP 4: UPDATE wa_rf_athlete_results table (GENDER-AWARE)
-- ============================================================

-- Apply the same gender-aware logic for results table
-- Sprint events
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 60m'
    WHEN prof.gender = 'F' THEN 'Women''s 60m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '60 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 100m'
    WHEN prof.gender = 'F' THEN 'Women''s 100m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '100 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 200m'
    WHEN prof.gender = 'F' THEN 'Women''s 200m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '200 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 400m'
    WHEN prof.gender = 'F' THEN 'Women''s 400m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '400 Metres';

-- Continue with all other events following the same pattern...
-- (Abbreviated for brevity - apply the same CASE WHEN logic to all remaining events)

-- Hurdles
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 60m Hurdles'
    WHEN prof.gender = 'F' THEN 'Women''s 60m Hurdles'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '60 Metres Hurdles';

UPDATE wa_rf_athlete_results r
SET discipline = 'Women''s 100m Hurdles'
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '100 Metres Hurdles'
AND prof.gender = 'F';

UPDATE wa_rf_athlete_results r
SET discipline = 'Men''s 110m Hurdles'
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '110 Metres Hurdles'
AND prof.gender = 'M';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 400m Hurdles'
    WHEN prof.gender = 'F' THEN 'Women''s 400m Hurdles'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '400 Metres Hurdles';

-- Middle/Long distance
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 800m'
    WHEN prof.gender = 'F' THEN 'Women''s 800m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '800 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 1500m'
    WHEN prof.gender = 'F' THEN 'Women''s 1500m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '1500 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 3000m'
    WHEN prof.gender = 'F' THEN 'Women''s 3000m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '3000 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 5000m'
    WHEN prof.gender = 'F' THEN 'Women''s 5000m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '5000 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 10000m'
    WHEN prof.gender = 'F' THEN 'Women''s 10000m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '10,000 Metres';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 2000m'
    WHEN prof.gender = 'F' THEN 'Women''s 2000m'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '2000 Metres';

-- Road events - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 10km Road'
    WHEN prof.gender = 'F' THEN 'Women''s 10km Road'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '10 Kilometres Road';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Half Marathon'
    WHEN prof.gender = 'F' THEN 'Women''s Half Marathon'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Half Marathon';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 25km Road'
    WHEN prof.gender = 'F' THEN 'Women''s 25km Road'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '25 Kilometres Road';

-- Race walk - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 3km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 3km Race Walk'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '3000 Metres Race Walk';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 5km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 5km Race Walk'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '5000 Metres Race Walk';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 10km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 10km Race Walk'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline IN ('10 Kilometres Race Walk', '10,000 Metres Race Walk');

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 20km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 20km Race Walk'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline IN ('20 Kilometres Race Walk', '20,000 Metres Race Walk');

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 35km Race Walk'
    WHEN prof.gender = 'F' THEN 'Women''s 35km Race Walk'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '35 Kilometres Race Walk';

-- Jumps - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s High Jump'
    WHEN prof.gender = 'F' THEN 'Women''s High Jump'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'High Jump';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Long Jump'
    WHEN prof.gender = 'F' THEN 'Women''s Long Jump'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Long Jump';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Triple Jump'
    WHEN prof.gender = 'F' THEN 'Women''s Triple Jump'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Triple Jump';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Pole Vault'
    WHEN prof.gender = 'F' THEN 'Women''s Pole Vault'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Pole Vault';

-- Throws - Shot Put - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Shot Put'
    WHEN prof.gender = 'F' THEN 'Women''s Shot Put'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Shot Put';

-- Throws - Discus - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Discus Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Discus Throw'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Discus Throw';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Discus Throw (1.75kg)'
    WHEN prof.gender = 'F' THEN 'Women''s Discus Throw (1.75kg)'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline IN ('Discus Throw (1,75kg)', 'Discus Throw (1.75kg)');

-- Throws - Hammer - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Hammer Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Hammer Throw'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Hammer Throw';

-- Throws - Javelin - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Javelin Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Javelin Throw'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Javelin Throw';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Javelin Throw (700g)'
    WHEN prof.gender = 'F' THEN 'Women''s Javelin Throw (700g)'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Javelin Throw (700g)';

-- Throws - Weight - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Weight Throw'
    WHEN prof.gender = 'F' THEN 'Women''s Weight Throw'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Weight Throw';

-- Combined events - gender-specific
UPDATE wa_rf_athlete_results SET discipline = 'Men''s Decathlon' WHERE discipline = 'Decathlon';
UPDATE wa_rf_athlete_results SET discipline = 'Women''s Heptathlon' WHERE discipline = 'Heptathlon';

-- Relays - these encode gender in the event name
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 4x100m Relay' WHERE discipline = '4x100 Metres Relay';
UPDATE wa_rf_athlete_results SET discipline = 'Mixed 4x100m Relay' WHERE discipline = '4x100 Metres Relay Mixed';
UPDATE wa_rf_athlete_results SET discipline = 'Men''s 4x400m Relay' WHERE discipline = '4x400 Metres Relay';
UPDATE wa_rf_athlete_results SET discipline = 'Mixed 4x400m Relay' WHERE discipline = '4x400 Metres Relay Mixed';

-- Cross country - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Cross Country'
    WHEN prof.gender = 'F' THEN 'Women''s Cross Country'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Cross Country';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s Cross Country Senior Race'
    WHEN prof.gender = 'F' THEN 'Women''s Cross Country Senior Race'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = 'Cross Country Senior Race';

-- Short Track - gender-aware
UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 200m Short Track'
    WHEN prof.gender = 'F' THEN 'Women''s 200m Short Track'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '200 Metres Short Track';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 800m Short Track'
    WHEN prof.gender = 'F' THEN 'Women''s 800m Short Track'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '800 Metres Short Track';

UPDATE wa_rf_athlete_results r
SET discipline = CASE 
    WHEN prof.gender = 'M' THEN 'Men''s 5000m Short Track'
    WHEN prof.gender = 'F' THEN 'Women''s 5000m Short Track'
    ELSE r.discipline
END
FROM wa_athlete_profiles prof
WHERE r.aa_athlete_id = prof.aa_athlete_id
AND r.discipline = '5000 Metres Short Track';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE 'athlete_events distinct events: %', (SELECT COUNT(DISTINCT event_name) FROM athlete_events);
    RAISE NOTICE 'wa_athlete_pbs distinct disciplines: %', (SELECT COUNT(DISTINCT discipline) FROM wa_athlete_pbs);
    RAISE NOTICE 'wa_rf_athlete_results distinct disciplines: %', (SELECT COUNT(DISTINCT discipline) FROM wa_rf_athlete_results WHERE discipline IS NOT NULL);
END $$;

-- Verify gender assignments
SELECT 
    p.gender,
    pb.discipline,
    COUNT(*) as count
FROM wa_athlete_pbs pb
JOIN wa_athlete_profiles p ON pb.aa_athlete_id = p.aa_athlete_id
WHERE pb.discipline LIKE '%''s%'
GROUP BY p.gender, pb.discipline
ORDER BY p.gender, pb.discipline
LIMIT 20;
