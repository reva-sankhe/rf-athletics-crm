-- Create athlete_events table
CREATE TABLE IF NOT EXISTS athlete_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aa_athlete_id VARCHAR NOT NULL,
  event_name VARCHAR NOT NULL,
  is_main_event BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_athlete 
    FOREIGN KEY (aa_athlete_id) 
    REFERENCES wa_athlete_profiles(aa_athlete_id) 
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_athlete_events_athlete_id ON athlete_events(aa_athlete_id);
CREATE INDEX idx_athlete_events_event_name ON athlete_events(event_name);
CREATE INDEX idx_athlete_events_main ON athlete_events(aa_athlete_id, is_main_event) WHERE is_main_event = true;

-- Migration script to populate from existing data
-- This will split the comma-separated events and mark the first one as main
WITH events_split AS (
  SELECT 
    aa_athlete_id,
    TRIM(event_value) as event_name,
    ROW_NUMBER() OVER (PARTITION BY aa_athlete_id ORDER BY event_index) as rn
  FROM wa_athlete_profiles,
  LATERAL (
    SELECT 
      unnest(string_to_array(reliance_events, ',')) as event_value,
      generate_series(1, array_length(string_to_array(reliance_events, ','), 1)) as event_index
  ) as events
  WHERE reliance_events IS NOT NULL AND reliance_events != ''
)
INSERT INTO athlete_events (aa_athlete_id, event_name, is_main_event)
SELECT 
  aa_athlete_id,
  event_name,
  (rn = 1) as is_main_event
FROM events_split
ON CONFLICT DO NOTHING;

-- Add a comment to the table
COMMENT ON TABLE athlete_events IS 'Stores normalized athlete events with main event flag';
COMMENT ON COLUMN athlete_events.is_main_event IS 'Indicates if this is the athlete''s primary event';
