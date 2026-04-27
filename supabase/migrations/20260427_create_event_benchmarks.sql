-- Create event_benchmarks table for storing competition standards and medal data
CREATE TABLE IF NOT EXISTS event_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR NOT NULL UNIQUE,
  gender CHAR(1),  -- 'M' or 'F' (extracted from event_name for filtering)
  
  -- Qualification Standards
  asian_games_qual_standard VARCHAR,
  commonwealth_games_qual_standard VARCHAR,
  
  -- Olympic Games Medal Data
  olympic_gold_result VARCHAR,
  olympic_gold_age INTEGER,
  olympic_silver_result VARCHAR,
  olympic_silver_age INTEGER,
  olympic_bronze_result VARCHAR,
  olympic_bronze_age INTEGER,
  
  -- Asian Games Medal Data
  asian_games_gold_result VARCHAR,
  asian_games_gold_age INTEGER,
  asian_games_silver_result VARCHAR,
  asian_games_silver_age INTEGER,
  asian_games_bronze_result VARCHAR,
  asian_games_bronze_age INTEGER,
  
  -- Commonwealth Games Medal Data
  cwg_gold_result VARCHAR,
  cwg_gold_age INTEGER,
  cwg_silver_result VARCHAR,
  cwg_silver_age INTEGER,
  cwg_bronze_result VARCHAR,
  cwg_bronze_age INTEGER,
  
  -- RF Internal Target
  rf_target VARCHAR,
  rf_target_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR
);

-- Indexes for performance
CREATE INDEX idx_event_benchmarks_event_name ON event_benchmarks(event_name);
CREATE INDEX idx_event_benchmarks_gender ON event_benchmarks(gender);

-- Function to automatically extract gender from event_name
CREATE OR REPLACE FUNCTION extract_gender_from_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_name LIKE 'Women''s%' THEN
    NEW.gender := 'F';
  ELSIF NEW.event_name LIKE 'Men''s%' THEN
    NEW.gender := 'M';
  ELSE
    NEW.gender := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set gender on insert/update
CREATE TRIGGER set_gender_from_event_name
  BEFORE INSERT OR UPDATE ON event_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION extract_gender_from_event();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_benchmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_event_benchmarks_timestamp
  BEFORE UPDATE ON event_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_event_benchmarks_updated_at();

-- Enable Row Level Security
ALTER TABLE event_benchmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to event_benchmarks" ON event_benchmarks;
DROP POLICY IF EXISTS "Allow authenticated write access to event_benchmarks" ON event_benchmarks;

-- Create RLS policies
-- Public read access (anyone can view benchmarks)
CREATE POLICY "Allow public read access to event_benchmarks"
  ON event_benchmarks
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can write (create, update, delete)
CREATE POLICY "Allow authenticated write access to event_benchmarks"
  ON event_benchmarks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE event_benchmarks IS 'Stores competition qualification standards, medal results, and RF targets for each athletics event';
COMMENT ON COLUMN event_benchmarks.event_name IS 'Standardized event name matching EVENT_TAXONOMY.md (e.g., "Women''s 100m")';
COMMENT ON COLUMN event_benchmarks.gender IS 'Automatically extracted from event_name: M for Men''s, F for Women''s';
COMMENT ON COLUMN event_benchmarks.rf_target IS 'Reliance Foundation internal performance target';
COMMENT ON COLUMN event_benchmarks.rf_target_notes IS 'Additional notes or context for the RF target';
