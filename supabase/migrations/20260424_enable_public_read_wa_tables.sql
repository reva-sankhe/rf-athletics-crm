-- Enable public read access for World Athletics tables
-- These tables contain public data that should be readable by all users

-- Enable RLS on tables (if not already enabled)
ALTER TABLE wa_toplists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_rf_athlete_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_qualification_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_athlete_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to wa_toplists" ON wa_toplists;
DROP POLICY IF EXISTS "Allow public read access to wa_rankings" ON wa_rankings;
DROP POLICY IF EXISTS "Allow public read access to wa_rf_athlete_results" ON wa_rf_athlete_results;
DROP POLICY IF EXISTS "Allow public read access to wa_qualification_standards" ON wa_qualification_standards;
DROP POLICY IF EXISTS "Allow public read access to wa_athlete_profiles" ON wa_athlete_profiles;

-- Create policies to allow anonymous SELECT (read) access
CREATE POLICY "Allow public read access to wa_toplists"
  ON wa_toplists
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to wa_rankings"
  ON wa_rankings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to wa_rf_athlete_results"
  ON wa_rf_athlete_results
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to wa_qualification_standards"
  ON wa_qualification_standards
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to wa_athlete_profiles"
  ON wa_athlete_profiles
  FOR SELECT
  TO anon
  USING (true);

-- Also allow authenticated users to read
CREATE POLICY "Allow authenticated read access to wa_toplists"
  ON wa_toplists
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to wa_rankings"
  ON wa_rankings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to wa_rf_athlete_results"
  ON wa_rf_athlete_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to wa_qualification_standards"
  ON wa_qualification_standards
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to wa_athlete_profiles"
  ON wa_athlete_profiles
  FOR SELECT
  TO authenticated
  USING (true);
