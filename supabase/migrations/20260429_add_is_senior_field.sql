-- Add is_senior field to wa_athlete_profiles
-- Purpose: Filter junior athletes from dashboard display
-- Date: April 29, 2026

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
