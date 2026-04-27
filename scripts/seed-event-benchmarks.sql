-- Seed Event Benchmarks
-- Run this in Supabase SQL Editor to add sample benchmark data

-- Women's 100m Hurdles
INSERT INTO event_benchmarks (
  event_name,
  asian_games_qual_standard,
  commonwealth_games_qual_standard,
  olympic_gold_result,
  olympic_gold_age,
  asian_games_gold_result,
  asian_games_gold_age,
  cwg_gold_result,
  cwg_gold_age,
  rf_target,
  rf_target_notes,
  updated_by
) VALUES (
  'Women''s 100m Hurdles',
  '12.95s',
  '13.05s',
  '12.26s',
  24,
  '12.72s',
  25,
  '12.78s',
  27,
  'Break 13.00s consistently',
  'Target for 2026 Asian Games qualification',
  'System'
) ON CONFLICT (event_name) DO UPDATE SET
  asian_games_qual_standard = EXCLUDED.asian_games_qual_standard,
  commonwealth_games_qual_standard = EXCLUDED.commonwealth_games_qual_standard,
  olympic_gold_result = EXCLUDED.olympic_gold_result,
  olympic_gold_age = EXCLUDED.olympic_gold_age,
  asian_games_gold_result = EXCLUDED.asian_games_gold_result,
  asian_games_gold_age = EXCLUDED.asian_games_gold_age,
  cwg_gold_result = EXCLUDED.cwg_gold_result,
  cwg_gold_age = EXCLUDED.cwg_gold_age,
  rf_target = EXCLUDED.rf_target,
  rf_target_notes = EXCLUDED.rf_target_notes,
  updated_by = EXCLUDED.updated_by;

-- Women's Long Jump
INSERT INTO event_benchmarks (
  event_name,
  asian_games_qual_standard,
  commonwealth_games_qual_standard,
  olympic_gold_result,
  olympic_gold_age,
  asian_games_gold_result,
  asian_games_gold_age,
  rf_target,
  updated_by
) VALUES (
  'Women''s Long Jump',
  '6.75m',
  '6.70m',
  '7.00m',
  26,
  '6.86m',
  24,
  'Break 6.80m barrier',
  'System'
) ON CONFLICT (event_name) DO UPDATE SET
  asian_games_qual_standard = EXCLUDED.asian_games_qual_standard,
  commonwealth_games_qual_standard = EXCLUDED.commonwealth_games_qual_standard,
  olympic_gold_result = EXCLUDED.olympic_gold_result,
  olympic_gold_age = EXCLUDED.olympic_gold_age,
  asian_games_gold_result = EXCLUDED.asian_games_gold_result,
  asian_games_gold_age = EXCLUDED.asian_games_gold_age,
  rf_target = EXCLUDED.rf_target,
  updated_by = EXCLUDED.updated_by;

-- Women's 100m
INSERT INTO event_benchmarks (
  event_name,
  asian_games_qual_standard,
  commonwealth_games_qual_standard,
  olympic_gold_result,
  olympic_gold_age,
  rf_target,
  updated_by
) VALUES (
  'Women''s 100m',
  '11.20s',
  '11.30s',
  '10.61s',
  29,
  'Sub-11.20s for Asian Games qualification',
  'System'
) ON CONFLICT (event_name) DO UPDATE SET
  asian_games_qual_standard = EXCLUDED.asian_games_qual_standard,
  commonwealth_games_qual_standard = EXCLUDED.commonwealth_games_qual_standard,
  olympic_gold_result = EXCLUDED.olympic_gold_result,
  olympic_gold_age = EXCLUDED.olympic_gold_age,
  rf_target = EXCLUDED.rf_target,
  updated_by = EXCLUDED.updated_by;

-- Women's 400m Hurdles
INSERT INTO event_benchmarks (
  event_name,
  asian_games_qual_standard,
  commonwealth_games_qual_standard,
  olympic_gold_result,
  olympic_gold_age,
  rf_target,
  updated_by
) VALUES (
  'Women''s 400m Hurdles',
  '55.50s',
  '56.00s',
  '51.46s',
  22,
  'Sub-56.00s consistently',
  'System'
) ON CONFLICT (event_name) DO UPDATE SET
  asian_games_qual_standard = EXCLUDED.asian_games_qual_standard,
  commonwealth_games_qual_standard = EXCLUDED.commonwealth_games_qual_standard,
  olympic_gold_result = EXCLUDED.olympic_gold_result,
  olympic_gold_age = EXCLUDED.olympic_gold_age,
  rf_target = EXCLUDED.rf_target,
  updated_by = EXCLUDED.updated_by;

-- Men's Javelin Throw
INSERT INTO event_benchmarks (
  event_name,
  asian_games_qual_standard,
  commonwealth_games_qual_standard,
  olympic_gold_result,
  olympic_gold_age,
  rf_target,
  updated_by
) VALUES (
  'Men''s Javelin Throw',
  '82.00m',
  '80.00m',
  '87.58m',
  25,
  'Consistent 85m+ throws',
  'System'
) ON CONFLICT (event_name) DO UPDATE SET
  asian_games_qual_standard = EXCLUDED.asian_games_qual_standard,
  commonwealth_games_qual_standard = EXCLUDED.commonwealth_games_qual_standard,
  olympic_gold_result = EXCLUDED.olympic_gold_result,
  olympic_gold_age = EXCLUDED.olympic_gold_age,
  rf_target = EXCLUDED.rf_target,
  updated_by = EXCLUDED.updated_by;

-- Verify the data was inserted
SELECT 
  event_name, 
  asian_games_qual_standard, 
  rf_target 
FROM event_benchmarks 
ORDER BY event_name;
