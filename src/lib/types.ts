export interface Athlete {
  id: string;
  code: string;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  age: number | null;
  year_of_birth: number | null;
  age_range: "U18" | "18-24" | "25+" | null;
  team: string;
  is_active: boolean;
  created_at: string;
}

export interface WAAthleteProfile {
  aa_athlete_id: string;
  reliance_name: string;
  birth_date: string | null;
  nationality: string | null;
  gender: string | null;
  scraped_at: string | null;
  reliance_events: string | null; // comma-separated events
  age: number | null;
}

export interface WAAthleteHonour {
  id: string;
  aa_athlete_id: string;
  category_name: string | null;
  competition: string | null;
  discipline: string | null;
  place: string | null;
  mark: string | null;
  date: string | null;
}

export interface WAAthletePersonalBest {
  id: string;
  aa_athlete_id: string;
  discipline: string | null;
  mark: string | null;
  wind: string | null;
  venue: string | null;
  date: string | null;
}

export interface AthleteEvent {
  id: string;
  aa_athlete_id: string;
  event_name: string;
  is_main_event: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalBestWithEvent extends WAAthletePersonalBest {
  event_name: string;
  is_main_event: boolean;
  formatted_mark: string;
}

export interface WAAthleteIdMap {
  result_athlete_id: string;
  aa_athlete_id: string;
  athlete_name: string;
  notes: string | null;
}

export interface WAAthleteSeasonBest {
  id: string;
  aa_athlete_id: string;
  discipline: string;
  mark: string;
  wind: string | null;
  venue: string;
  date: string;
}

export interface WACompetition {
  id: number;
  iaaf_id: number | null;
  name: string;
  venue: string;
  area: string;
  country: string;
  start_date: string;
  end_date: string;
  date_range: string;
  season: string | null;
  ranking_category: string;
  competition_group: string;
  competition_subgroup: string | null;
  disciplines: string;
  has_results: boolean;
  has_startlist: boolean;
  was_url: string | null;
  scraped_at: string;
  key_competition: string | null;
}

export interface WAQualificationStandard {
  id: string;
  competition: string;
  year: number;
  event: string;
  gender: string;
  standard: string;
}

export interface WARanking {
  id: string;
  event_group: string;
  rank: number;
  athlete_name: string;
  country: string;
  rank_date: string;
  scraped_at: string;
  ranking_score: number;
}

export interface WAResult {
  id: string;
  competition_id: number;
  discipline: string;
  event: string;
  gender: string;
  is_relay: boolean;
  race_id: number;
  race_date: string;
  wind: string | null;
  athlete_id: string;
  athlete_name: string;
  nationality: string;
  birth_date: string;
  mark: string;
  place: string;
  points: number | null;
  records: string;
  remark: string | null;
  qualified: string | null;
  scraped_at: string;
  birth_date_parsed: string;
  athlete_age: number;
  wa_athlete_id: string;
}

export interface WARFAthleteResult {
  id: string;
  aa_athlete_id: string;
  athlete_name: string;
  year: number;
  date: string;
  competition: string;
  competition_id: number;
  venue: string;
  country: string;
  indoor: boolean | null;
  discipline: string;
  category: string;
  race: string;
  place: string;
  mark: string;
  wind: string | null;
  result_score: number;
  remark: string;
  not_legal: boolean;
  scraped_at: string;
}

export interface WAToplist {
  id: string;
  event: string;
  gender: string;
  year: number;
  rank: number;
  mark: string;
  wind: string | null;
  athlete_name: string;
  nationality: string;
  venue: string;
  date: string;
  score: string;
  scraped_at: string;
  region: string;
}

export type Team = string;
