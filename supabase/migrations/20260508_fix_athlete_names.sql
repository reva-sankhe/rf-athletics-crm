-- Fix reliance_name to match WA canonical names so scouting tab excludes them correctly.
-- The scouting tab uses exact case-insensitive name matching against wa_toplists.athlete_name.

UPDATE wa_athlete_profiles SET reliance_name = 'Ancy Sojan Edappilly'
  WHERE aa_athlete_id = '14791355';

UPDATE wa_athlete_profiles SET reliance_name = 'G. Reegan'
  WHERE aa_athlete_id = '15051236';

UPDATE wa_athlete_profiles SET reliance_name = 'Yashas Palaksha'
  WHERE aa_athlete_id = '14881854';

-- Add Tamilarasu Senthilkumar (WA ID 15004338) who was missing from wa_athlete_profiles
INSERT INTO wa_athlete_profiles
  (aa_athlete_id, reliance_name, nationality, gender, is_senior, reliance_events)
VALUES
  ('15004338', 'Tamilarasu Senthilkumar', 'IND', 'M', true, 'Men''s 100m')
ON CONFLICT (aa_athlete_id) DO NOTHING;

INSERT INTO athlete_events (id, aa_athlete_id, event_name, is_main_event)
VALUES (gen_random_uuid(), '15004338', 'Men''s 100m', true)
ON CONFLICT DO NOTHING;

-- Update denormalized athlete_name in results rows for display consistency
UPDATE wa_rf_athlete_results SET athlete_name = 'Ancy Sojan Edappilly'
  WHERE aa_athlete_id = '14791355';

UPDATE wa_rf_athlete_results SET athlete_name = 'G. Reegan'
  WHERE aa_athlete_id = '15051236';

UPDATE wa_rf_athlete_results SET athlete_name = 'Yashas Palaksha'
  WHERE aa_athlete_id = '14881854';
