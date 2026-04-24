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

export type Team = string;
