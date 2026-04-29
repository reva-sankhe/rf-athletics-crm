import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { classifyEvent } from "@/lib/eventUtils";
import { Users, Trophy, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Parses a WA mark string into a numeric value.
 * Time events → seconds (handles "H:MM:SS", "M:SS.ss", "SS.ss")
 * Field events → numeric value (strips trailing units like "m")
 * Returns null for DNS/DNF/DQ/NM/NH/ND or unparseable marks.
 */
function parseMark(mark: string): number | null {
  if (!mark) return null;
  const upper = mark.trim().toUpperCase();
  if (['DNF', 'DNS', 'DQ', 'NM', 'NH', 'ND', 'NR', '-', ''].includes(upper)) return null;

  // Strip trailing non-numeric suffixes (e.g. "m", "km")
  const cleaned = mark.trim().replace(/[a-zA-Z]+$/, '').trim();

  // H:MM:SS.ss (marathon / race walk)
  const hms = cleaned.match(/^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseFloat(hms[3]);

  // M:SS.ss (800m, 1500m, etc.)
  const ms = cleaned.match(/^(\d+):(\d{2}(?:\.\d+)?)$/);
  if (ms) return parseInt(ms[1]) * 60 + parseFloat(ms[2]);

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Returns the most frequently occurring non-relay discipline for an athlete,
 * which is used as their primary event for trend analysis.
 */
function getPrimaryDiscipline(results: WARFAthleteResult[]): string | null {
  const nonRelay = results.filter(r => !/relay|4x/i.test(r.discipline));
  if (nonRelay.length === 0) return null;
  const counts = new Map<string, number>();
  for (const r of nonRelay) counts.set(r.discipline, (counts.get(r.discipline) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

interface AthleteSummary {
  id: string;
  name: string;
  gender: string;
  age: number | null;
  events: string[];
  bestScore: number;
  latestScore: number;
  trend: "up" | "down" | "stable";
  resultsCount: number;
}

export function RFSquadTab() {
  const [, navigate] = useLocation();
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [results, setResults] = useState<WARFAthleteResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [athletesData, resultsData] = await Promise.all([
        fetchWAAthleteProfiles(),
        fetchWARFAthleteResults(undefined, 1000),
      ]);
      setAthletes(athletesData);
      setResults(resultsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const summaries: AthleteSummary[] = athletes.flatMap(athlete => {
    const athResults = results
      .filter(r => r.aa_athlete_id === athlete.aa_athlete_id && !r.not_legal)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (athResults.length === 0) return [];

    // Season Best trend using actual marks (times/distances) over the last 3 years.
    // Uses the athlete's primary discipline (most frequent non-relay event).
    // For time events (lower = better): SB = min mark per year.
    // For field events (higher = better): SB = max mark per year.
    // Any improvement oldest→newest = up; any decline = down; equal or no data = stable.
    const primaryDiscipline = getPrimaryDiscipline(athResults);
    const { direction } = primaryDiscipline
      ? classifyEvent(primaryDiscipline)
      : { direction: 'lower_better' as const };
    const isLowerBetter = direction === 'lower_better';

    const disciplineResults = primaryDiscipline
      ? athResults.filter(r => r.discipline === primaryDiscipline)
      : athResults;

    const currentYear = disciplineResults.length > 0
      ? Math.max(...disciplineResults.map(r => r.year))
      : new Date().getFullYear();

    const getSeasonBestMark = (year: number): number | null => {
      const parsed = disciplineResults
        .filter(r => r.year === year)
        .map(r => parseMark(r.mark))
        .filter((v): v is number => v !== null);
      if (parsed.length === 0) return null;
      return isLowerBetter ? Math.min(...parsed) : Math.max(...parsed);
    };

    // Collect season bests for the last 3 years (oldest → newest)
    const seasonBests = [
      getSeasonBestMark(currentYear - 2),
      getSeasonBestMark(currentYear - 1),
      getSeasonBestMark(currentYear),
    ].filter((v): v is number => v !== null);

    let trend: "up" | "down" | "stable" = "stable";
    if (seasonBests.length >= 2) {
      const oldest = seasonBests[0];
      const newest = seasonBests[seasonBests.length - 1];
      if (newest !== oldest) {
        // For lower_better (time): improving = newer mark is smaller
        // For higher_better (field): improving = newer mark is larger
        trend = isLowerBetter
          ? (newest < oldest ? "up" : "down")
          : (newest > oldest ? "up" : "down");
      }
    }

    return [{
      id: athlete.aa_athlete_id,
      name: athlete.reliance_name,
      gender: athlete.gender || "M",
      age: athlete.age,
      events: athlete.reliance_events
        ? athlete.reliance_events.split(",").map(e => e.trim()).filter(Boolean)
        : [],
      bestScore: Math.max(...athResults.map(r => r.result_score)),
      latestScore: athResults[0].result_score,
      trend,
      resultsCount: athResults.length,
    }];
  });

  const men = summaries.filter(a => a.gender === "M");
  const women = summaries.filter(a => a.gender === "F");
  const improving = summaries.filter(a => a.trend === "up").length;
  const highPerformers = summaries.filter(a => a.bestScore >= 1000).length;

  const menSorted = men.sort((a, b) => b.bestScore - a.bestScore);
  const womenSorted = women.sort((a, b) => b.bestScore - a.bestScore);

  const getTierColor = (score: number) => {
    if (score >= 1100) return "bg-emerald-50 dark:bg-emerald-950/30";
    if (score >= 1000) return "bg-blue-50 dark:bg-blue-950/30";
    if (score >= 900) return "bg-amber-50 dark:bg-amber-950/30";
    return "bg-red-50 dark:bg-red-950/30";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Total Athletes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{athletes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{men.length} Men · {women.length} Women</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" /> High Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{highPerformers}</p>
            <p className="text-xs text-muted-foreground mt-1">Score ≥ 1000</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" /> Improving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{improving}</p>
            <p className="text-xs text-muted-foreground mt-1">Upward trend</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>RF Squad Leaderboard</CardTitle>
            <CardDescription className="mt-0">Athletes ranked by best performance score</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 inline-block" />
                  <span className="text-muted-foreground">Elite ≥1100</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 inline-block" />
                  <span className="text-muted-foreground">Strong ≥1000</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 inline-block" />
                  <span className="text-muted-foreground">Developing ≥900</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 inline-block" />
                  <span className="text-muted-foreground">Emerging &lt;900</span>
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-muted-foreground">Season best improved over 3 yrs</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-muted-foreground">Season best declined over 3 yrs</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">No change / insufficient data</span>
                </span>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:divide-x">
                {/* Women Section */}
                <div className="lg:pr-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    Women
                    <span className="text-sm text-muted-foreground font-normal">({womenSorted.length})</span>
                  </h3>
                  <div className="space-y-1">
                    {womenSorted.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No women athletes</div>
                    ) : (
                      womenSorted.map((athlete, index) => (
                        <div key={athlete.id} className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-muted-foreground w-7 text-right flex-shrink-0">{index + 1}.</span>
                          <div
                            onClick={() => navigate(`/athletes/${athlete.id}`)}
                            className={`flex-1 p-3 rounded-lg border ${getTierColor(athlete.bestScore)} hover:shadow-sm transition-shadow cursor-pointer`}
                          >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{athlete.name}</h4>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Age: {athlete.age ?? "—"}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs flex-shrink-0">
                                <div className="whitespace-nowrap">
                                  <span className="text-muted-foreground">Current:</span>
                                  <span className="font-bold ml-1">{athlete.latestScore}</span>
                                </div>
                                <div className="whitespace-nowrap">
                                  <span className="text-muted-foreground">Best:</span>
                                  <span className="font-semibold ml-1">{athlete.bestScore}</span>
                                </div>
                                <div className="whitespace-nowrap">
                                  <span className="text-muted-foreground">Trend:</span>
                                  {athlete.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-600 inline ml-1" />}
                                  {athlete.trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-500 inline ml-1" />}
                                  {athlete.trend === "stable" && <Minus className="h-3.5 w-3.5 text-muted-foreground inline ml-1" />}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {athlete.events.slice(0, 3).map(event => (
                                <Badge key={event} variant="outline" className="text-xs py-0 px-1.5">{event}</Badge>
                              ))}
                              {athlete.events.length > 3 && (
                                <Badge variant="outline" className="text-xs py-0 px-1.5">+{athlete.events.length - 3}</Badge>
                              )}
                              {athlete.events.length === 0 && (
                                <span className="text-xs text-muted-foreground">No events</span>
                              )}
                            </div>
                          </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Men Section */}
                <div className="lg:pl-3">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    Men
                    <span className="text-sm text-muted-foreground font-normal">({menSorted.length})</span>
                  </h3>
                  <div className="space-y-1">
                    {menSorted.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No men athletes</div>
                    ) : (
                      menSorted.map((athlete, index) => (
                        <div key={athlete.id} className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-muted-foreground w-7 text-right flex-shrink-0">{index + 1}.</span>
                          <div
                            onClick={() => navigate(`/athletes/${athlete.id}`)}
                            className={`flex-1 p-3 rounded-lg border ${getTierColor(athlete.bestScore)} hover:shadow-sm transition-shadow cursor-pointer`}
                          >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{athlete.name}</h4>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Age: {athlete.age ?? "—"}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs flex-shrink-0">
                                <div className="whitespace-nowrap">
                                  <span className="text-muted-foreground">Current:</span>
                                  <span className="font-bold ml-1">{athlete.latestScore}</span>
                                </div>
                                <div className="whitespace-nowrap">
                                  <span className="text-muted-foreground">Best:</span>
                                  <span className="font-semibold ml-1">{athlete.bestScore}</span>
                                </div>
                                <div className="whitespace-nowrap">
                                  <span className="text-muted-foreground">Trend:</span>
                                  {athlete.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-600 inline ml-1" />}
                                  {athlete.trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-500 inline ml-1" />}
                                  {athlete.trend === "stable" && <Minus className="h-3.5 w-3.5 text-muted-foreground inline ml-1" />}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {athlete.events.slice(0, 3).map(event => (
                                <Badge key={event} variant="outline" className="text-xs py-0 px-1.5">{event}</Badge>
                              ))}
                              {athlete.events.length > 3 && (
                                <Badge variant="outline" className="text-xs py-0 px-1.5">+{athlete.events.length - 3}</Badge>
                              )}
                              {athlete.events.length === 0 && (
                                <span className="text-xs text-muted-foreground">No events</span>
                              )}
                            </div>
                          </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
