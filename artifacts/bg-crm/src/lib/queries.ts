import { supabase } from "./supabase";
import type { Player, TestSession, TestResult } from "./types";

// Players
export async function fetchPlayers(team?: string): Promise<Player[]> {
  let q = supabase.from("players").select("*").order("name");
  if (team) q = q.eq("team", team);
  const { data, error } = await q;
  if (error) throw error;
  return data as Player[];
}

export async function fetchPlayer(id: string): Promise<Player | null> {
  const { data, error } = await supabase.from("players").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Player;
}

export async function createPlayer(player: Omit<Player, "id" | "created_at">): Promise<Player> {
  const { data, error } = await supabase.from("players").insert(player).select().single();
  if (error) throw error;
  return data as Player;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
  const { data, error } = await supabase.from("players").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Player;
}

// Test Sessions
export async function fetchSessions(): Promise<TestSession[]> {
  const { data, error } = await supabase.from("test_sessions").select("*").order("test_date", { ascending: false });
  if (error) throw error;
  return data as TestSession[];
}

export async function createSession(session: Omit<TestSession, "id" | "created_at">): Promise<TestSession> {
  const { data, error } = await supabase.from("test_sessions").insert(session).select().single();
  if (error) throw error;
  return data as TestSession;
}

// Test Results
export async function fetchResultsBySession(sessionId: string): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw error;
  return data as TestResult[];
}

export async function fetchResultsByPlayer(playerId: string): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("*, test_sessions(test_date, test_name)")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as TestResult[];
}

export async function fetchAllResults(): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("*, players(name, code, team, primary_position, age_range), test_sessions(test_date, test_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as TestResult[];
}

export async function bulkInsertResults(results: Omit<TestResult, "id" | "created_at">[]): Promise<void> {
  const { error } = await supabase.from("test_results").insert(results);
  if (error) throw error;
}

// Dashboard helpers
export async function fetchLatestSessionResults(team: string): Promise<{
  session: TestSession | null;
  results: (TestResult & { players: Pick<Player, "name" | "code" | "team"> })[];
}> {
  // Get all sessions
  const sessions = await fetchSessions();
  if (!sessions.length) return { session: null, results: [] };

  // Find the most recent session with results for this team
  for (const session of sessions) {
    const { data, error } = await supabase
      .from("test_results")
      .select("*, players!inner(name, code, team)")
      .eq("session_id", session.id)
      .eq("players.team", team);
    if (error) throw error;
    if (data && data.length > 0) {
      return { session, results: data as (TestResult & { players: Pick<Player, "name" | "code" | "team"> })[] };
    }
  }
  return { session: null, results: [] };
}

export interface TeamAvgBroncho {
  session: TestSession;
  avgBronchoMins: number;
  playerCount: number;
}

export async function fetchTeamAvgBroncho(team: string): Promise<TeamAvgBroncho[]> {
  const sessions = await fetchSessions();
  const results: TeamAvgBroncho[] = [];

  for (const session of [...sessions].reverse()) {
    const { data, error } = await supabase
      .from("test_results")
      .select("bronco_mins, players!inner(team)")
      .eq("session_id", session.id)
      .eq("players.team", team)
      .not("bronco_mins", "is", null);
    if (error) throw error;
    if (data && data.length > 0) {
      const avg = data.reduce((sum: number, r: { bronco_mins: number | null }) => sum + (r.bronco_mins ?? 0), 0) / data.length;
      results.push({ session, avgBronchoMins: avg, playerCount: data.length });
    }
  }
  return results;
}
