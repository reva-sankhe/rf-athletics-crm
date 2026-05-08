import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchWAToplists, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAToplist, WAAthleteProfile } from "@/lib/types";
import { TOPLIST_DISCIPLINE_GROUPS } from "@/lib/eventGroups";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Target, Star } from "lucide-react";


export function ScoutingRadarTab() {
  const [toplists, setToplists] = useState<WAToplist[]>([]);
  const [rfAthletes, setRFAthletes] = useState<WAAthleteProfile[]>([]);
  const [gender, setGender] = useState("M");
  const [discipline, setDiscipline] = useState("100m");
  const [loading, setLoading] = useState(true);

  const genderPrefix = gender === "M" ? "Men's" : "Women's";
  const selectedEvent = `${genderPrefix} ${discipline}`;

  useEffect(() => { loadData(); }, [selectedEvent]);

  async function loadData() {
    setLoading(true);
    try {
      const [toplistData, rfData] = await Promise.all([
        fetchWAToplists(selectedEvent, gender, 200),
        fetchWAAthleteProfiles(),
      ]);
      setToplists(toplistData);
      setRFAthletes(rfData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleGenderChange(g: string) {
    setGender(g);
    const allEvents = (TOPLIST_DISCIPLINE_GROUPS[g] ?? TOPLIST_DISCIPLINE_GROUPS.M).flatMap(gr => gr.events);
    if (!allEvents.includes(discipline)) setDiscipline(allEvents[0]);
  }

  const rfNamesLower = new Set(rfAthletes.map(a => a.reliance_name.toLowerCase()));
  const isRF = (name: string) => rfNamesLower.has(name.toLowerCase());

  const rfInEvent = toplists
    .filter(t => isRF(t.athlete_name))
    .map(t => ({ name: t.athlete_name, score: parseInt(t.score) || 0 }))
    .sort((a, b) => b.score - a.score);
  const rfBestScore = rfInEvent.length > 0 ? rfInEvent[0].score : null;

  // Deduplicate non-RF Indian athletes, keeping highest score per name
  const scouts = Array.from(
    toplists
      .filter(t => t.nationality === "IND" && !isRF(t.athlete_name))
      .reduce((map, t) => {
        const key = t.athlete_name.toLowerCase();
        const existing = map.get(key);
        if (!existing || (parseInt(t.score) || 0) > (parseInt(existing.score) || 0)) {
          map.set(key, t);
        }
        return map;
      }, new Map<string, WAToplist>())
      .values()
  )
    .map(t => ({
      name: t.athlete_name,
      mark: t.mark,
      score: parseInt(t.score) || 0,
      region: t.region,
      venue: t.venue,
      date: t.date,
      gapToRFBest: rfBestScore !== null ? rfBestScore - (parseInt(t.score) || 0) : null,
    }))
    .sort((a, b) => b.score - a.score);

  const topTargets = scouts.filter(s => rfBestScore !== null && s.score >= rfBestScore);

  const chartData = scouts.slice(0, 20).map((s, i) => ({
    rank: i + 1,
    name: s.name,
    score: s.score,
    isTarget: rfBestScore !== null && s.score >= rfBestScore,
  }));

  const disciplineGroups = TOPLIST_DISCIPLINE_GROUPS[gender] ?? TOPLIST_DISCIPLINE_GROUPS.M;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <div className="flex gap-1">
                {[{ value: "M", label: "Men's" }, { value: "F", label: "Women's" }].map(g => (
                  <button
                    key={g.value}
                    onClick={() => handleGenderChange(g.value)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      gender === g.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">Event</Label>
              <SearchableSelect
                value={discipline}
                onValueChange={setDiscipline}
                groups={disciplineGroups.map(g => ({
                  label: g.label,
                  options: g.events.map(e => ({ value: e, label: e })),
                }))}
                searchPlaceholder="Search events…"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scout Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{scouts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Indian athletes not in RF</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" /> Top Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{topTargets.length}</p>
            <p className="text-xs text-muted-foreground mt-1">athletes beating RF best</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-blue-500" /> RF Best Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rfBestScore !== null ? (
              <>
                <p className="text-3xl font-bold text-blue-600">{rfBestScore}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{rfInEvent[0]?.name}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No RF data for this event</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" /> Top Targets
          </CardTitle>
          <CardDescription>
            {rfBestScore !== null
              ? `Athletes outscoring RF best (${rfBestScore}) in ${selectedEvent}`
              : `Top athletes in ${selectedEvent} — no RF benchmark yet`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : topTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">
              No non-RF Indian athletes currently exceed the RF best score for this event.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topTargets.map((s, i) => (
                <div
                  key={i}
                  className="p-3 border rounded-lg space-y-1 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs">#{i + 1}</Badge>
                    <span className="text-xs text-muted-foreground">{s.region}</span>
                  </div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{s.mark}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold">{s.score}</p>
                    {s.gapToRFBest !== null && s.gapToRFBest <= 0 && (
                      <span className="text-xs text-emerald-600 font-medium">
                        +{Math.abs(s.gapToRFBest)} above RF
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score curve */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Curve — {selectedEvent}</CardTitle>
          <CardDescription>Non-RF Indian athletes ranked by score (top 20)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data for this event</div>
          ) : (
            <>
              <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Top targets
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Other candidates
                </span>
                {rfBestScore && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-6 border-t-2 border-blue-500 border-dashed inline-block" /> RF best ({rfBestScore})
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
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
                  {rfBestScore && (
                    <ReferenceLine y={rfBestScore} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                  )}
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
                          cx={cx} cy={cy} r={4}
                          fill={payload.isTarget ? "#f59e0b" : "#94a3b8"}
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

      {/* Full scouting table */}
      <Card>
        <CardHeader>
          <CardTitle>All Scout Candidates</CardTitle>
          <CardDescription>All Indian non-RF athletes · {selectedEvent} · sorted by score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-right p-2">Mark</th>
                  <th className="text-right p-2">Score</th>
                  <th className="text-right p-2">vs RF Best</th>
                  <th className="text-left p-2">Region</th>
                  <th className="text-left p-2">Venue</th>
                </tr>
              </thead>
              <tbody>
                {scouts.map((s, i) => {
                  const isTarget = rfBestScore !== null && s.score >= rfBestScore;
                  return (
                    <tr
                      key={i}
                      className={`border-b hover:bg-muted/40 ${isTarget ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                    >
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">
                        {isTarget && (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs mr-1.5">Target</Badge>
                        )}
                        {s.name}
                      </td>
                      <td className="p-2 text-right font-mono">{s.mark}</td>
                      <td className="p-2 text-right font-semibold">{s.score}</td>
                      <td className={`p-2 text-right ${
                        s.gapToRFBest === null
                          ? "text-muted-foreground"
                          : s.gapToRFBest <= 0
                          ? "text-emerald-600 font-semibold"
                          : "text-amber-600"
                      }`}>
                        {s.gapToRFBest !== null
                          ? s.gapToRFBest <= 0
                            ? `+${Math.abs(s.gapToRFBest)} ahead`
                            : `-${s.gapToRFBest}`
                          : "—"}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{s.region}</Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground truncate max-w-[150px]">{s.venue}</td>
                    </tr>
                  );
                })}
                {!loading && scouts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No non-RF Indian athletes found for this event
                    </td>
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
