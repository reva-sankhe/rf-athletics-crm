-- Create a comprehensive view for all event data for tracked athletes
-- This view consolidates data from multiple tables for the 42 athletes in wa_athlete_profiles

CREATE OR REPLACE VIEW athlete_all_events_data AS
SELECT 
    -- Athlete information
    ap.aa_athlete_id,
    ap.reliance_name AS athlete_name,
    ap.gender,
    ap.birth_date,
    ap.nationality,
    
    -- Event information
    ae.event_name,
    ae.is_main_event,
    
    -- Personal Best data
    pb.id AS pb_id,
    pb.discipline AS pb_discipline,
    pb.mark AS pb_mark,
    pb.venue AS pb_venue,
    pb.date AS pb_date,
    pb.notWindLegal AS pb_not_wind_legal,
    pb.updated_at AS pb_updated_at,
    
    -- Season Best data
    sb.id AS sb_id,
    sb.discipline AS sb_discipline,
    sb.mark AS sb_mark,
    sb.venue AS sb_venue,
    sb.date AS sb_date,
    sb.notWindLegal AS sb_not_wind_legal,
    sb.updated_at AS sb_updated_at,
    
    -- Latest Result data (most recent competition result)
    r.id AS latest_result_id,
    r.discipline AS latest_result_discipline,
    r.mark AS latest_result_mark,
    r.place AS latest_result_place,
    r.venue AS latest_result_venue,
    r.date AS latest_result_date,
    r.competition AS latest_result_competition,
    r.notWindLegal AS latest_result_not_wind_legal,
    
    -- Result count for this event
    (
        SELECT COUNT(*)
        FROM wa_rf_athlete_results r2
        WHERE r2.aa_athlete_id = ap.aa_athlete_id
        AND (r2.discipline = ae.event_name OR r2.discipline = pb.discipline)
    ) AS total_results_count

FROM 
    wa_athlete_profiles ap
    
-- Join with athlete events (the normalized events table)
LEFT JOIN athlete_events ae 
    ON ap.aa_athlete_id = ae.aa_athlete_id
    
-- Join with personal bests
LEFT JOIN wa_athlete_pbs pb 
    ON ap.aa_athlete_id = pb.aa_athlete_id
    AND (pb.discipline = ae.event_name 
         OR pb.discipline LIKE '%' || REPLACE(ae.event_name, '''', '') || '%'
         OR ae.event_name LIKE '%' || REPLACE(pb.discipline, '''', '') || '%')
    
-- Join with season bests
LEFT JOIN wa_athlete_season_bests sb 
    ON ap.aa_athlete_id = sb.aa_athlete_id
    AND (sb.discipline = ae.event_name
         OR sb.discipline LIKE '%' || REPLACE(ae.event_name, '''', '') || '%'
         OR ae.event_name LIKE '%' || REPLACE(sb.discipline, '''', '') || '%')
    
-- Join with most recent result for each event
LEFT JOIN LATERAL (
    SELECT *
    FROM wa_rf_athlete_results
    WHERE aa_athlete_id = ap.aa_athlete_id
    AND (discipline = ae.event_name
         OR discipline LIKE '%' || REPLACE(ae.event_name, '''', '') || '%'
         OR ae.event_name LIKE '%' || REPLACE(discipline, '''', '') || '%')
    ORDER BY date DESC
    LIMIT 1
) r ON true

ORDER BY 
    ap.reliance_name,
    ae.is_main_event DESC,
    ae.event_name;

-- Add comment to the view
COMMENT ON VIEW athlete_all_events_data IS 'Comprehensive view showing all event data (PBs, SBs, results) for all tracked athletes in wa_athlete_profiles';

-- Create a simpler summary view for quick analysis
CREATE OR REPLACE VIEW athlete_events_summary AS
SELECT 
    ap.aa_athlete_id,
    ap.reliance_name AS athlete_name,
    ap.gender,
    ae.event_name,
    ae.is_main_event,
    
    -- Personal best info
    pb.mark AS personal_best,
    pb.date AS pb_date,
    pb.venue AS pb_venue,
    
    -- Season best info
    sb.mark AS season_best,
    sb.date AS sb_date,
    
    -- Count of all results for this event
    (
        SELECT COUNT(*)
        FROM wa_rf_athlete_results r
        WHERE r.aa_athlete_id = ap.aa_athlete_id
        AND r.discipline = ae.event_name
    ) AS result_count,
    
    -- Most recent result
    (
        SELECT date
        FROM wa_rf_athlete_results r
        WHERE r.aa_athlete_id = ap.aa_athlete_id
        AND r.discipline = ae.event_name
        ORDER BY date DESC
        LIMIT 1
    ) AS last_competed,
    
    -- Best result from competitions
    (
        SELECT mark
        FROM wa_rf_athlete_results r
        WHERE r.aa_athlete_id = ap.aa_athlete_id
        AND r.discipline = ae.event_name
        ORDER BY mark ASC
        LIMIT 1
    ) AS best_competition_result

FROM 
    wa_athlete_profiles ap
    INNER JOIN athlete_events ae ON ap.aa_athlete_id = ae.aa_athlete_id
    LEFT JOIN wa_athlete_pbs pb ON ap.aa_athlete_id = pb.aa_athlete_id AND pb.discipline = ae.event_name
    LEFT JOIN wa_athlete_season_bests sb ON ap.aa_athlete_id = sb.aa_athlete_id AND sb.discipline = ae.event_name

ORDER BY 
    ap.reliance_name,
    ae.is_main_event DESC,
    ae.event_name;

COMMENT ON VIEW athlete_events_summary IS 'Simplified summary view of athlete events with key performance metrics';

-- Grant read access to the views
GRANT SELECT ON athlete_all_events_data TO anon, authenticated;
GRANT SELECT ON athlete_events_summary TO anon, authenticated;
