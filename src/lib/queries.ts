import { supabase } from "./supabase";
import type { Athlete, WAAthleteProfile, WAAthleteHonour, WAAthletePersonalBest, AthleteEvent, PersonalBestWithEvent } from "./types";
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

// WA Athlete Honours
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
