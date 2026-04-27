import { supabase } from "./supabase";
import type { 
  Athlete, 
  WAAthleteProfile, 
  WAAthleteHonour, 
  WAAthletePersonalBest,
  AthleteEvent,
  PersonalBestWithEvent,
  WAAthleteIdMap,
  WAAthleteSeasonBest,
  WACompetition,
  WAQualificationStandard,
  WARanking,
  WAResult,
  WARFAthleteResult,
  WAToplist
} from "./types";
import { isEventMatch, formatPerformance } from "./eventUtils";

// Athletes
export async function fetchAthletes(team?: string): Promise<Athlete[]> {
  let q = supabase.from("players").select("*").order("name");
  if (team) q = q.eq("team", team);
  const { data, error } = await q;
  if (error) throw error;
  return data as Athlete[];
}

export async function fetchAthlete(id: string): Promise<Athlete | null> {
  const { data, error } = await supabase.from("players").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Athlete;
}

export async function createAthlete(athlete: Omit<Athlete, "id" | "created_at">): Promise<Athlete> {
  const { data, error } = await supabase
    .from("players")
    .insert({ id: crypto.randomUUID(), ...athlete })
    .select()
    .single();
  if (error) throw error;
  return data as Athlete;
}

export async function updateAthlete(id: string, updates: Partial<Athlete>): Promise<Athlete> {
  const { data, error } = await supabase.from("players").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Athlete;
}

// WA Athlete Profiles
export async function fetchWAAthleteProfiles(): Promise<WAAthleteProfile[]> {
  const { data, error } = await supabase
    .from("wa_athlete_profiles")
    .select("*")
    .order("reliance_name");
  if (error) throw error;
  return data as WAAthleteProfile[];
}

export async function fetchWAAthleteProfile(id: string): Promise<WAAthleteProfile | null> {
  const { data, error } = await supabase
    .from("wa_athlete_profiles")
    .select("*")
    .eq("aa_athlete_id", id)
    .single();
  if (error) throw error;
  return data as WAAthleteProfile;
}

// WA Athlete Honours (all athletes)
export async function fetchAllWAAthleteHonours(limit = 1000): Promise<WAAthleteHonour[]> {
  const { data, error } = await supabase
    .from("wa_athlete_honours")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as WAAthleteHonour[];
}

export async function fetchWAAthleteHonours(athleteId: string): Promise<WAAthleteHonour[]> {
  const { data, error } = await supabase
    .from("wa_athlete_honours")
    .select("*")
    .eq("aa_athlete_id", athleteId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as WAAthleteHonour[];
}

// WA Athlete Personal Bests
export async function fetchWAAthletePersonalBests(athleteId: string): Promise<WAAthletePersonalBest[]> {
  const { data, error } = await supabase
    .from("wa_athlete_pbs")
    .select("*")
    .eq("aa_athlete_id", athleteId)
    .order("discipline");
  if (error) throw error;
  return data as WAAthletePersonalBest[];
}

// Athlete Events
export async function fetchAthleteEvents(athleteId: string): Promise<AthleteEvent[]> {
  const { data, error } = await supabase
    .from("athlete_events")
    .select("*")
    .eq("aa_athlete_id", athleteId)
    .order("is_main_event", { ascending: false })
    .order("event_name");
  if (error) throw error;
  return data as AthleteEvent[];
}

// Fetch personal bests matched to athlete's specific events
export async function fetchPersonalBestsForAthleteEvents(
  athleteId: string
): Promise<PersonalBestWithEvent[]> {
  try {
    // Get athlete's events
    const events = await fetchAthleteEvents(athleteId);
    
    // Get all personal bests
    const pbs = await fetchWAAthletePersonalBests(athleteId);
    
    // Match PBs to events using smart matching
    const matched: PersonalBestWithEvent[] = [];
    
    for (const event of events) {
      // Find the best matching PB for this event
      const matchingPB = pbs.find(pb => 
        pb.discipline && isEventMatch(pb.discipline, event.event_name)
      );
      
      if (matchingPB) {
        matched.push({
          ...matchingPB,
          event_name: event.event_name,
          is_main_event: event.is_main_event,
          formatted_mark: formatPerformance(matchingPB.mark, event.event_name)
        });
      }
    }
    
    return matched;
  } catch (error) {
    console.error("Error fetching personal bests for athlete events:", error);
    return [];
  }
}

// WA Athlete ID Map
export async function fetchWAAthleteIdMaps(): Promise<WAAthleteIdMap[]> {
  const { data, error } = await supabase
    .from("wa_athlete_id_map")
    .select("*")
    .order("athlete_name");
  if (error) throw error;
  return data as WAAthleteIdMap[];
}

// WA Athlete Season Bests
export async function fetchWAAthleteSeasonBests(athleteId: string): Promise<WAAthleteSeasonBest[]> {
  const { data, error } = await supabase
    .from("wa_athlete_season_bests")
    .select("*")
    .eq("aa_athlete_id", athleteId)
    .order("discipline");
  if (error) throw error;
  return data as WAAthleteSeasonBest[];
}

// WA Competitions
export async function fetchWACompetitions(limit = 100): Promise<WACompetition[]> {
  const { data, error } = await supabase
    .from("wa_competitions")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as WACompetition[];
}

export async function fetchWACompetition(id: number): Promise<WACompetition | null> {
  const { data, error } = await supabase
    .from("wa_competitions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as WACompetition;
}

// WA Qualification Standards
export async function fetchWAQualificationStandards(): Promise<WAQualificationStandard[]> {
  const { data, error } = await supabase
    .from("wa_qualification_standards")
    .select("*")
    .order("competition", { ascending: false })
    .order("event");
  if (error) throw error;
  return data as WAQualificationStandard[];
}

// WA Rankings
export async function fetchWARankings(eventGroup?: string, limit = 100): Promise<WARanking[]> {
  let query = supabase
    .from("wa_rankings")
    .select("*")
    .order("rank")
    .limit(limit);
  
  if (eventGroup) {
    query = query.eq("event_group", eventGroup);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data as WARanking[];
}

// WA Results
export async function fetchWAResults(competitionId?: number, limit = 100): Promise<WAResult[]> {
  let query = supabase
    .from("wa_results")
    .select("*")
    .order("race_date", { ascending: false })
    .limit(limit);
  
  if (competitionId) {
    query = query.eq("competition_id", competitionId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data as WAResult[];
}

// WA RF Athlete Results
export async function fetchWARFAthleteResults(athleteId?: string, limit = 100): Promise<WARFAthleteResult[]> {
  let query = supabase
    .from("wa_rf_athlete_results")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);
  
  if (athleteId) {
    query = query.eq("aa_athlete_id", athleteId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data as WARFAthleteResult[];
}

// WA Toplists
export async function fetchWAToplists(event?: string, gender?: string, limit = 100): Promise<WAToplist[]> {
  let query = supabase
    .from("wa_toplists")
    .select("*")
    .order("rank")
    .limit(limit);
  
  if (event) {
    query = query.eq("event", event);
  }
  if (gender) {
    query = query.eq("gender", gender);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data as WAToplist[];
}

// WA Finals data (for Finals Benchmark tab)
export async function fetchFinalistsForEvent(
  competition = "All Major",
  gender?: string
): Promise<WAResult[]> {
  let compQuery = supabase
    .from("wa_competitions")
    .select("id");

  if (competition === "World Championships") {
    compQuery = compQuery.ilike("competition_group", "%World Athletics Championships%");
  } else if (competition === "Asian Games") {
    compQuery = compQuery.ilike("name", "%asian games%");
  } else if (competition === "Commonwealth Games") {
    compQuery = compQuery.ilike("name", "%commonwealth%");
  } else {
    // All Major: World Championships + Asian Games + Commonwealth Games
    compQuery = compQuery.or(
      "competition_group.ilike.%World Athletics Championships%," +
      "name.ilike.%asian games%," +
      "name.ilike.%commonwealth%"
    );
  }

  const { data: comps, error: compError } = await compQuery;
  if (compError || !comps || comps.length === 0) return [];

  const compIds = (comps as { id: number }[]).map(c => c.id);

  let resultQuery = supabase
    .from("wa_results")
    .select("*")
    .in("competition_id", compIds)
    .limit(5000);

  if (gender) {
    resultQuery = resultQuery.eq("gender", gender);
  }

  const { data, error } = await resultQuery;
  if (error) throw error;
  return (data ?? []) as WAResult[];
}

// Helper function to get unique events from all athletes
export function getUniqueEvents(athletes: WAAthleteProfile[]): string[] {
  const eventsSet = new Set<string>();
  athletes.forEach((athlete) => {
    if (athlete.reliance_events) {
      const events = athlete.reliance_events.split(',').map(e => e.trim());
      events.forEach(event => eventsSet.add(event));
    }
  });
  return Array.from(eventsSet).sort();
}
