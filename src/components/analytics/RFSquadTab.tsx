import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, Users, Trophy, Activity, Target } from "lucide-react";

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

function tierColor(score: number) {
  if (score >= 1100) return "#10b981";
  if (score >= 1000) return "#3b82f6";
  if (score >= 900) return "#f59e0b";
  return "#ef4444";
}

export function RFSquadTab() {
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

    const recent = athResults.slice(0, 3);
    const older = athResults.slice(3, 6);
    const avgRecent = recent.reduce((s, r) => s + r.result_score, 0) / recent.length;
    const avgOlder = older.length > 0
      ? older.reduce((s, r) => s + r.result_score, 0) / older.length
      : avgRecent;

    const trend: "up" | "down" | "stable" =
      avgRecent - avgOlder > 15 ? "up" :
      avgRecent - avgOlder < -15 ? "down" : "stable";

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

  const sorted = [...summaries].sort((a, b) => b.bestScore - a.bestScore);
  const men = summaries.filter(a => a.gender === "M");
  const women = summaries.filter(a => a.gender === "F");
  const avgM = men.length ? Math.round(men.reduce((s, a) => s + a.bestScore, 0) / men.length) : 0;
  const avgF = women.length ? Math.round(women.reduce((s, a) => s + a.bestScore, 0) / women.length) : 0;
  const improving = summaries.filter(a => a.trend === "up").length;
  const highPerformers = summaries.filter(a => a.bestScore >= 1000).length;

  const curveData = sorted.map((a, i) => ({
    rank: i + 1,
    name: a.name,
    score: a.bestScore,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Target className="h-4 w-4" /> Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgM}</p>
            <p className="text-xs text-muted-foreground mt-1">Men · Women: {avgF}</p>
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
          <CardTitle>Squad Performance Curve</CardTitle>
          <CardDescription>All RF athletes ranked by best WA score</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : curveData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">No performance data available</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Elite ≥1100</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Strong ≥1000</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Developing ≥900</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Emerging &lt;900</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={curveData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rank" label={{ value: "Rank", position: "insideBottom", offset: -4 }} tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: "WA Score", angle: -90, position: "insideLeft" }} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.name}</p>
                          <p>Score: <strong>{d.score}</strong></p>
                          <p className="text-muted-foreground">Rank #{d.rank}</p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-${payload.rank}`}
                          cx={cx} cy={cy} r={5}
                          fill={tierColor(payload.score)}
                          stroke="white" strokeWidth={1.5}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All RF Athletes</CardTitle>
          <CardDescription>Sorted by best performance score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-center p-2">Gender</th>
                  <th className="text-center p-2">Age</th>
                  <th className="text-left p-2">Events</th>
                  <th className="text-right p-2">Best Score</th>
                  <th className="text-right p-2">Latest</th>
                  <th className="text-center p-2">Trend</th>
                  <th className="text-left p-2">Tier</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a, i) => (
                  <tr key={a.id} className="border-b hover:bg-muted/40">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2 font-medium">{a.name}</td>
                    <td className="p-2 text-center text-muted-foreground">{a.gender}</td>
                    <td className="p-2 text-center">{a.age ?? "—"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {a.events.slice(0, 2).map(e => (
                          <Badge key={e} variant="outline" className="text-xs py-0">{e}</Badge>
                        ))}
                        {a.events.length > 2 && (
                          <Badge variant="outline" className="text-xs py-0">+{a.events.length - 2}</Badge>
                        )}
                        {a.events.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </td>
                    <td className="p-2 text-right font-semibold">{a.bestScore}</td>
                    <td className="p-2 text-right text-muted-foreground">{a.latestScore}</td>
                    <td className="p-2 text-center">
                      {a.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-600 mx-auto" />}
                      {a.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                      {a.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="p-2">
                      {a.bestScore >= 1100 ? (
                        <Badge className="bg-emerald-600 text-white text-xs">Elite</Badge>
                      ) : a.bestScore >= 1000 ? (
                        <Badge className="bg-blue-600 text-white text-xs">Strong</Badge>
                      ) : a.bestScore >= 900 ? (
                        <Badge variant="secondary" className="text-xs">Developing</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Emerging</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">No athlete data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
