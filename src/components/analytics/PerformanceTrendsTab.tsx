import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { classifyEvent } from "@/lib/eventUtils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

/** Convert a mark string to a numeric value for plotting.
 *  Time events: "9.85" → 9.85, "1:45.23" → 105.23 (seconds)
 *  Field events: "8.50m" or "8.50" → 8.50 (metres)
 */
function parseMarkToNumeric(mark: string, isTimeBased: boolean): number | null {
  if (!mark) return null;
  const clean = mark.replace(/[^0-9.:]/g, "");
  if (!clean) return null;

  if (isTimeBased) {
    const parts = clean.split(":");
    if (parts.length === 3) {
      // H:MM:SS.ss
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // MM:SS.ss
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    } else {
      const v = parseFloat(parts[0]);
      return isNaN(v) ? null : v;
    }
  } else {
    const v = parseFloat(clean);
    return isNaN(v) ? null : v;
  }
}

/** Format a numeric value back to a readable mark string. */
function formatNumericAsMark(value: number, isTimeBased: boolean): string {
  if (!isTimeBased) return value.toFixed(2) + "m";
  if (value < 60) return value.toFixed(2);
  if (value < 3600) {
    const mins = Math.floor(value / 60);
    const secs = (value % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, "0")}`;
  }
  const hours = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = (value % 60).toFixed(2);
  return `${hours}:${String(mins).padStart(2, "0")}:${secs.padStart(5, "0")}`;
}

export function PerformanceTrendsTab() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [allResults, setAllResults] = useState<WARFAthleteResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
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

  // Reset discipline when athlete changes
  useEffect(() => {
    setSelectedDiscipline("");
  }, [selectedId]);

  const selectedAthlete = athletes.find(a => a.aa_athlete_id === selectedId);

  // All results for the selected athlete
  const allAthleteResults = allResults.filter(r => r.aa_athlete_id === selectedId);

  // Unique disciplines sorted
  const disciplines = Array.from(new Set(allAthleteResults.map(r => r.discipline).filter(Boolean))).sort();

  // Effective discipline (use first available when none selected)
  const effectiveDiscipline = selectedDiscipline || disciplines[0] || "";

  // Legal results for the selected discipline, sorted chronologically
  const disciplineResults = allAthleteResults
    .filter(r => !r.not_legal && r.discipline === effectiveDiscipline && r.mark)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Classify the event
  const eventClass = effectiveDiscipline ? classifyEvent(effectiveDiscipline) : null;
  const isTimeBased = eventClass?.direction === "lower_better";
  const unit = eventClass?.unit || "";

  // Parse marks to numeric
  const resultsWithNumeric = disciplineResults
    .map(r => ({
      ...r,
      numericMark: parseMarkToNumeric(r.mark, isTimeBased),
      dateLabel: new Date(r.date).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "2-digit",
      }),
    }))
    .filter(r => r.numericMark !== null) as (typeof disciplineResults[0] & {
      numericMark: number;
      dateLabel: string;
    })[];

  // ── Chart 1: all results chronologically ──────────────────────────────────
  const trendData = resultsWithNumeric.map(r => ({
    date: r.date,
    dateLabel: r.dateLabel,
    value: r.numericMark,
    mark: r.mark,
    competition: r.competition,
  }));

  // ── Chart 2: year-on-year – best mark per month per year ──────────────────
  const yearMonthMap: Record<string, Record<number, number[]>> = {};
  resultsWithNumeric.forEach(r => {
    const d = new Date(r.date);
    const year = d.getFullYear().toString();
    const month = d.getMonth();
    if (!yearMonthMap[year]) yearMonthMap[year] = {};
    if (!yearMonthMap[year][month]) yearMonthMap[year][month] = [];
    yearMonthMap[year][month].push(r.numericMark);
  });
  const years = Object.keys(yearMonthMap).sort();

  const yoyData = MONTHS.map((m, idx) => {
    const point: Record<string, number | string> = { month: m };
    years.forEach(year => {
      const vals = yearMonthMap[year]?.[idx];
      if (vals && vals.length > 0) {
        // best = fastest (min) for time events, furthest (max) for field
        point[year] = isTimeBased ? Math.min(...vals) : Math.max(...vals);
      }
    });
    return point;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allMarks = resultsWithNumeric.map(r => r.numericMark);
  const bestMark = allMarks.length > 0
    ? (isTimeBased ? Math.min(...allMarks) : Math.max(...allMarks))
    : null;

  // Trend direction based on last 3 vs previous 3 results
  const recent3 = allMarks.slice(-3);
  const prev3 = allMarks.slice(-6, -3);
  const avgRecent = recent3.length ? recent3.reduce((s, v) => s + v, 0) / recent3.length : 0;
  const avgPrev = prev3.length ? prev3.reduce((s, v) => s + v, 0) / prev3.length : avgRecent;
  const diff = avgRecent - avgPrev;
  // For time: improving = negative diff (faster); for field: improving = positive diff
  const overallTrend = isTimeBased
    ? (diff < -0.05 ? "up" : diff > 0.05 ? "down" : "stable")
    : (diff > 0.05 ? "up" : diff < -0.05 ? "down" : "stable");

  // Current season (last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const currentSeasonCount = resultsWithNumeric.filter(r => new Date(r.date) > oneYearAgo).length;

  // Y-axis domain with padding
  const yMin = allMarks.length ? Math.min(...allMarks) : 0;
  const yMax = allMarks.length ? Math.max(...allMarks) : 10;
  const yPad = (yMax - yMin) * 0.12 || 0.5;
  const yDomain: [number, number] = [Math.max(0, yMin - yPad), yMax + yPad];

  const yAxisLabel = isTimeBased ? "Time (s)" : `Distance (${unit || "m"})`;

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs">Athlete</Label>
              <SearchableSelect
                value={selectedId}
                onValueChange={setSelectedId}
                options={athletes.map(a => ({ value: a.aa_athlete_id, label: a.reliance_name }))}
                placeholder="Select athlete"
                searchPlaceholder="Search athletes…"
              />
            </div>
            {disciplines.length > 1 && (
              <div className="space-y-1.5 min-w-[180px]">
                <Label className="text-xs">Event</Label>
                <SearchableSelect
                  value={effectiveDiscipline}
                  onValueChange={setSelectedDiscipline}
                  options={disciplines.map(d => ({ value: d, label: d }))}
                  placeholder="Select event"
                  searchPlaceholder="Search events…"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Stat cards ── */}
      {selectedAthlete && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Personal Best</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {bestMark !== null ? formatNumericAsMark(bestMark, isTimeBased) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">all-time · {effectiveDiscipline}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{resultsWithNumeric.length}</p>
              <p className="text-xs text-muted-foreground mt-1">career</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Results (12mo)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{currentSeasonCount}</p>
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

      {/* ── Charts ── */}
      <div className={`grid gap-4 ${years.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>

        {/* Chart 1: Performance over time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Performance Over Time</CardTitle>
            <CardDescription className="text-xs">
              {effectiveDiscipline} — {selectedAthlete?.reliance_name}
              {isTimeBased ? " (lower = faster)" : " (higher = farther)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground">Loading…</div>
            ) : trendData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground">No results for this event</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 9 }}
                    angle={-30}
                    textAnchor="end"
                    height={52}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain}
                    reversed={isTimeBased}
                    tickFormatter={(v) => formatNumericAsMark(v, isTimeBased)}
                    label={{
                      value: yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 10 },
                      dx: -4,
                    }}
                    tick={{ fontSize: 9 }}
                    width={62}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.dateLabel}</p>
                          <p>Mark: <strong>{d.mark}</strong></p>
                          <p className="text-muted-foreground text-xs">{d.competition}</p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: "#3b82f6", stroke: "white", strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Year-on-year comparison */}
        {years.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Year-on-Year Comparison</CardTitle>
              <CardDescription className="text-xs">
                Best {isTimeBased ? "time" : "mark"} per month by season — {selectedAthlete?.reliance_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-2 text-xs text-muted-foreground">
                {years.map((year, i) => (
                  <span key={year} className="flex items-center gap-1.5">
                    <span
                      className="w-5 border-t-2 inline-block"
                      style={{ borderColor: YEAR_COLORS[i % YEAR_COLORS.length] }}
                    />
                    {year}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={yoyData} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    reversed={isTimeBased}
                    tickFormatter={(v) => formatNumericAsMark(v, isTimeBased)}
                    label={{
                      value: yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 10 },
                      dx: -4,
                    }}
                    tick={{ fontSize: 9 }}
                    width={62}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.month}</p>
                          {years.map(year =>
                            d[year] !== undefined ? (
                              <p key={year}>
                                {year}: <strong>{formatNumericAsMark(d[year] as number, isTimeBased)}</strong>
                              </p>
                            ) : null
                          )}
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
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
