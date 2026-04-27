import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function PerformanceTrendsTab() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [allResults, setAllResults] = useState<WARFAthleteResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ath, res] = await Promise.all([
        fetchWAAthleteProfiles(),
        fetchWARFAthleteResults(undefined, 1000),
      ]);
      setAthletes(ath);
      setAllResults(res);
      if (ath.length > 0) setSelectedId(ath[0].aa_athlete_id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const selectedAthlete = athletes.find(a => a.aa_athlete_id === selectedId);
  const athleteResults = allResults
    .filter(r => r.aa_athlete_id === selectedId && !r.not_legal)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Monthly score trend (chronological)
  const monthlyMap: Record<string, number[]> = {};
  athleteResults.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[key]) monthlyMap[key] = [];
    monthlyMap[key].push(r.result_score);
  });
  const trendData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, scores]) => ({
      period,
      score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      count: scores.length,
    }));

  // Year-on-year comparison
  const yearMonthMap: Record<string, Record<number, number[]>> = {};
  athleteResults.forEach(r => {
    const d = new Date(r.date);
    const year = d.getFullYear().toString();
    const month = d.getMonth();
    if (!yearMonthMap[year]) yearMonthMap[year] = {};
    if (!yearMonthMap[year][month]) yearMonthMap[year][month] = [];
    yearMonthMap[year][month].push(r.result_score);
  });
  const years = Object.keys(yearMonthMap).sort();
  const yoyData = MONTHS.map((m, idx) => {
    const point: Record<string, number | string> = { month: m };
    years.forEach(year => {
      const scores = yearMonthMap[year]?.[idx];
      if (scores && scores.length > 0) {
        point[year] = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      }
    });
    return point;
  });

  // Stats
  const allScores = athleteResults.map(r => r.result_score);
  const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0;

  // Trend direction (last 3 vs previous 3)
  const recent3 = athleteResults.slice(-3).map(r => r.result_score);
  const prev3 = athleteResults.slice(-6, -3).map(r => r.result_score);
  const avgRecent = recent3.length ? recent3.reduce((s, v) => s + v, 0) / recent3.length : 0;
  const avgPrev = prev3.length ? prev3.reduce((s, v) => s + v, 0) / prev3.length : avgRecent;
  const overallTrend = avgRecent - avgPrev > 15 ? "up" : avgRecent - avgPrev < -15 ? "down" : "stable";

  // Current season (last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const currentSeasonResults = athleteResults.filter(r => new Date(r.date) > oneYearAgo);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs">Athlete</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
              <SelectContent>
                {athletes.map(a => (
                  <SelectItem key={a.aa_athlete_id} value={a.aa_athlete_id}>
                    {a.reliance_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedAthlete && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bestScore || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">all-time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{avgScore || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">career</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Results (12mo)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{currentSeasonResults.length}</p>
              <p className="text-xs text-muted-foreground mt-1">competitions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mt-1">
                {overallTrend === "up" && <TrendingUp className="h-7 w-7 text-emerald-600" />}
                {overallTrend === "down" && <TrendingDown className="h-7 w-7 text-red-500" />}
                {overallTrend === "stable" && <Minus className="h-7 w-7 text-muted-foreground" />}
                <span className="text-sm capitalize text-muted-foreground">{overallTrend}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Score Over Time</CardTitle>
          <CardDescription>Monthly average WA score — {selectedAthlete?.reliance_name}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : trendData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">No results data for this athlete</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={55} />
                <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                        <p className="font-semibold">{d.period}</p>
                        <p>Avg Score: <strong>{d.score}</strong></p>
                        <p className="text-muted-foreground">{d.count} result{d.count !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3b82f6", stroke: "white", strokeWidth: 1.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {years.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Year-on-Year Comparison</CardTitle>
            <CardDescription>Monthly average score by season — {selectedAthlete?.reliance_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <>
              <div className="flex flex-wrap gap-3 mb-3 text-xs text-muted-foreground">
                {years.map((year, i) => (
                  <span key={year} className="flex items-center gap-1.5">
                    <span className="w-6 border-t-2 inline-block" style={{ borderColor: YEAR_COLORS[i % YEAR_COLORS.length] }} />
                    {year}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={yoyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.month}</p>
                          {years.map(year => d[year] !== undefined && (
                            <p key={year}>{year}: <strong>{d[year]}</strong></p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {years.map((year, i) => (
                    <Line
                      key={year}
                      type="monotone"
                      dataKey={year}
                      stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, stroke: "white", strokeWidth: 1 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Competition History</CardTitle>
          <CardDescription>All results for {selectedAthlete?.reliance_name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Competition</th>
                  <th className="text-left p-2">Discipline</th>
                  <th className="text-right p-2">Mark</th>
                  <th className="text-right p-2">Score</th>
                  <th className="text-center p-2">Place</th>
                </tr>
              </thead>
              <tbody>
                {[...athleteResults].reverse().slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/40">
                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-2 max-w-[200px] truncate">{r.competition}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">{r.discipline}</Badge>
                    </td>
                    <td className="p-2 text-right font-mono">{r.mark}</td>
                    <td className="p-2 text-right font-semibold">{r.result_score}</td>
                    <td className="p-2 text-center text-muted-foreground">{r.place || "—"}</td>
                  </tr>
                ))}
                {athleteResults.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No results found</td>
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
