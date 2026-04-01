export interface Player {
  id: string;
  code: string;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  age: number | null;
  year_of_birth: number | null;
  age_range: "U18" | "18-24" | "25+" | null;
  team: "Sharks" | "Wildcats";
  is_active: boolean;
  created_at: string;
}

export interface TestSession {
  id: string;
  test_date: string;
  test_name: string;
  type: string | null;
  notes: string | null;
  created_at: string;
}

export interface TestResult {
  id: string;
  session_id: string;
  player_id: string;
  bronco_mins: number | null;
  mas_ms: number | null;
  seconds: number | null;
  ten_m_1: number | null;
  ten_m_2: number | null;
  twenty_m_1: number | null;
  twenty_m_2: number | null;
  forty_m_1: number | null;
  forty_m_2: number | null;
  eighty_m_runs: number | null;
  sixty_m_runs: number | null;
  forty_m_runs: number | null;
  notes: string | null;
  created_at: string;
}

export type Team = "Sharks" | "Wildcats";

export interface MasTier {
  label: string;
  color: string;
  bgColor: string;
  min: number;
  max: number;
}

export const MAS_TIERS: MasTier[] = [
  { label: "World Record", color: "#f59e0b", bgColor: "bg-amber-500", min: 4.5, max: Infinity },
  { label: "Elite Pro",    color: "#8b5cf6", bgColor: "bg-violet-500", min: 4.3, max: 4.5 },
  { label: "Outstanding",  color: "#3b82f6", bgColor: "bg-blue-500",   min: 4.1, max: 4.3 },
  { label: "Very Good",    color: "#10b981", bgColor: "bg-emerald-500", min: 3.9, max: 4.1 },
  { label: "Good",         color: "#22c55e", bgColor: "bg-green-500",  min: 3.7, max: 3.9 },
  { label: "Average",      color: "#f97316", bgColor: "bg-orange-500", min: 3.5, max: 3.7 },
  { label: "Below Average",color: "#ef4444", bgColor: "bg-red-500",    min: 0,   max: 3.5 },
];

export function getMasTier(mas: number): MasTier {
  return MAS_TIERS.find((t) => mas >= t.min && mas < t.max) ?? MAS_TIERS[MAS_TIERS.length - 1];
}
