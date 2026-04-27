import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchAllWAAthleteHonours, fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteHonour, WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { normalizeEventName, classifyEvent } from "@/lib/eventUtils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell
} from "recharts";
import { Award, Target, Users } from "lucide-react";

const COMPETITIONS = ["All Major", "Asian Games", "Commonwealth Games", "World Championships"];
const EVENTS = [
  "100m", "200m", "400m", "800m", "1500m", "5000m", "10000m",
  "110m Hurdles", "100m Hurdles", "400m Hurdles", "3000m Steeplechase",
  "Marathon",
  "High Jump", "Pole Vault", "Long Jump", "Triple Jump",
  "Shot Put", "Discus Throw", "Hammer Throw", "Javelin Throw",
  "Decathlon", "Heptathlon",
];

function timeToSeconds(s: string): number {
  const parts = s.split(/[:.]/).map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 100;
  if (parts.length === 2) return parts[0] + parts[1] / 100;
  return parseFloat(s);
}

function secondsToTime(secs: number): string {
  if (secs >= 60) {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(2).padStart(5, "0");
    return `${m}:${s}`;
  }
  return secs.toFixed(2);
}

function parseMark(mark: string, event: string): number | null {
  const direction = classifyEvent(event).direction;
  const cleaned = mark.replace(/\s*\([^)]*\)/g, "").trim();
  if (direction === "lower_better") {
    const t = cleaned.replace(/[^0-9:.]/g, "");
    if (!t) return null;
    const v = timeToSeconds(t);
    return isNaN(v) ? null : v;
  } else {
    const v = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
    return isNaN(v) ? null : v;
  }
}

function formatMark(val: number, event: string): string {
  const direction = classifyEvent(event).direction;
  return direction === "lower_better" ? secondsToTime(val) : val.toString();
}

function markGapToBronze(athleteMark: number, bronzeMark: number, event: string): number {
  const direction = classifyEvent(event).direction;
  if (direction === "lower_better") {
    return (athleteMark - bronzeMark) / bronzeMark * 100;
  } else {
    return (bronzeMark - athleteMark) / bronzeMark * 100;
  }
}

function ageAtDate(birthDate: string | null, eventDate: string | null): number | null {
  if (!birthDate || !eventDate) return null;
  const birth = new Date(birthDate);
  const evt = new Date(eventDate);
  if (isNaN(birth.getTime()) || isNaN(evt.getTime())) return null;
  return Math.floor((evt.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function medalRank(place: string | null): "gold" | "silver" | "bronze" | null {
  if (!place) return null;
  const p = place.toLowerCase().trim();
  if (p === "1" || p === "1st" || p === "gold") return "gold";
  if (p === "2" || p === "2nd" || p === "silver") return "silver";
  if (p === "3" || p === "3rd" || p === "bronze") return "bronze";
  return null;
}

const MEDAL_COLORS = { gold: "#f59e0b", silver: "#94a3b8", bronze: "#b45309" };

export function MedalIntelligenceTab() {
  const [honours, setHonours] = useState<WAAthleteHonour[]>([]);
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [results, setResults] = useState<WARFAthleteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState("All Major");
  const [event, setEvent] = useState("100m");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [hon, ath, res] = await Promise.all([
        fetchAllWAAthleteHonours(1000),
        fetchWAAthleteProfiles(),
        fetchWARFAthleteResults(undefined, 500),
      ]);
      setHonours(hon);
      setAthletes(ath);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const birthDateMap = new Map(athletes.map(a => [a.aa_athlete_id, a.birth_date]));
  const athleteNameMap = new Map(athletes.map(a => [a.aa_athlete_id, a.reliance_name]));

  // Filter honours by competition and event
  const eventNorm = normalizeEventName(event);
  const filteredHonours = honours.filter(h => {
    const discMatch = h.discipline && normalizeEventName(h.discipline) === eventNorm;
    if (!discMatch) return false;
    if (competition === "All Major") return true;
    return h.category_name?.toLowerCase().includes(competition.toLowerCase()) ||
           h.competition?.toLowerCase().includes(competition.toLowerCase());
  });

  const medals = filteredHonours.filter(h => medalRank(h.place) !== null);

  // Age distribution histogram: age at time of medal
  const ageGroups: Record<number, number> = {};
  medals.forEach(h => {
    const age = ageAtDate(birthDateMap.get(h.aa_athlete_id) ?? null, h.date);
    if (age !== null && age >= 15 && age <= 40) {
      ageGroups[age] = (ageGroups[age] || 0) + 1;
    }
  });
  const ageData = Array.from({ length: 26 }, (_, i) => {
    const age = 15 + i;
    return { age, medals: ageGroups[age] || 0 };
  });

  // Current RF athlete ages for overlay
  const rfAthleteAges = athletes
    .filter(a => a.age !== null)
    .map(a => ({ name: a.reliance_name, age: a.age! }));

  const isHigherBetter = classifyEvent(event).direction === "higher_better";

  // Historical winning marks by year
  const marksByYear: Record<number, { gold?: number; silver?: number; bronze?: number }> = {};
  medals.forEach(h => {
    if (!h.date || !h.mark) return;
    const year = new Date(h.date).getFullYear();
    const rank = medalRank(h.place);
    if (!rank) return;
    const val = parseMark(h.mark, event);
    if (val === null || val <= 0) return;
    if (!marksByYear[year]) marksByYear[year] = {};
    const existing = marksByYear[year][rank];
    // For time events: keep minimum (faster). For field events: keep maximum (further/higher).
    const isBetter = existing === undefined ||
      (isHigherBetter ? val > existing : val < existing);
    if (isBetter) marksByYear[year][rank] = val;
  });
  const winningMarksData = Object.entries(marksByYear)
    .map(([year, marks]) => ({
      year: parseInt(year),
      gold: marks.gold,
      silver: marks.silver,
      bronze: marks.bronze,
    }))
    .sort((a, b) => a.year - b.year);

  // Current RF prospects vs medal marks
  const latestYear = winningMarksData[winningMarksData.length - 1];
  const bronzeMark = latestYear?.bronze;

  const prospects = athletes.flatMap(athlete => {
    const athResults = results.filter(
      r => r.aa_athlete_id === athlete.aa_athlete_id &&
        !r.not_legal &&
        normalizeEventName(r.discipline) === eventNorm
    );
    if (athResults.length === 0) return [];
    const best = athResults.reduce((b, r) => r.result_score > b.result_score ? r : b);
    const athleteVal = parseMark(best.mark, event);
    const gapToBronze = bronzeMark !== undefined && athleteVal !== null
      ? parseFloat(markGapToBronze(athleteVal, bronzeMark, event).toFixed(2))
      : null;
    const medalAge = athlete.age !== null
      ? ageData.some(d => d.age === athlete.age && d.medals > 0)
      : false;

    return [{
      name: athlete.reliance_name,
      age: athlete.age,
      bestMark: best.mark,
      bestScore: best.result_score,
      gapToBronze,
      inMedalAgeWindow: medalAge,
    }];
  }).sort((a, b) => (a.gapToBronze ?? 99) - (b.gapToBronze ?? 99));

  const medalCount = medals.length;
  const golds = medals.filter(h => medalRank(h.place) === "gold").length;
  const uniqueMedalists = new Set(medals.map(h => h.aa_athlete_id)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" /> Total Medals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{medalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{golds} gold · RF athletes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Medalists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{uniqueMedalists}</p>
            <p className="text-xs text-muted-foreground mt-1">unique RF athletes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" /> Current Prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {prospects.filter(p => p.gapToBronze !== null && p.gapToBronze < 2).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">within 2% of bronze mark</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs">Competition</Label>
              <Select value={competition} onValueChange={setCompetition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPETITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs">Event</Label>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Age distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age at Time of Medal</CardTitle>
            <CardDescription>Histogram of RF athletes' ages when they won medals</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">Loading…</div>
            ) : medals.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">No medal data for selected filters</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ageData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize: 10 }} label={{ value: "Age", position: "insideBottom", offset: -4 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const rfAtAge = rfAthleteAges.filter(a => a.age === d.age).map(a => a.name);
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">Age {d.age}</p>
                          <p>{d.medals} medal{d.medals !== 1 ? "s" : ""} won at this age</p>
                          {rfAtAge.length > 0 && (
                            <p className="text-blue-600 mt-1">RF athletes now: {rfAtAge.join(", ")}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  {rfAthleteAges.map(a => (
                    <ReferenceLine
                      key={a.name}
                      x={a.age}
                      stroke="#3b82f6"
                      strokeDasharray="3 2"
                      strokeWidth={1.5}
                    />
                  ))}
                  <Bar dataKey="medals" name="Medals" radius={[2, 2, 0, 0]}>
                    {ageData.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={entry.medals > 0 ? "#f59e0b" : "#e2e8f0"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-xs text-muted-foreground mt-2">Blue dashed lines = current RF athlete ages</p>
          </CardContent>
        </Card>

        {/* Historical winning marks */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Winning Marks</CardTitle>
            <CardDescription>Gold / Silver / Bronze marks by year — lower = faster</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">Loading…</div>
            ) : winningMarksData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">No winning mark data</div>
            ) : (
              <>
                <div className="flex gap-3 mb-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Gold</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Silver</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-700 inline-block" /> Bronze</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={winningMarksData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => formatMark(v, event)}
                      reversed={!isHigherBetter}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                            <p className="font-semibold">{d.year}</p>
                            {d.gold && <p className="text-amber-500">Gold: {formatMark(d.gold, event)}</p>}
                            {d.silver && <p className="text-slate-500">Silver: {formatMark(d.silver, event)}</p>}
                            {d.bronze && <p className="text-amber-700">Bronze: {formatMark(d.bronze, event)}</p>}
                          </div>
                        );
                      }}
                    />
                    <Line type="monotone" dataKey="gold" stroke={MEDAL_COLORS.gold} strokeWidth={2} dot={{ r: 4, fill: MEDAL_COLORS.gold }} connectNulls />
                    <Line type="monotone" dataKey="silver" stroke={MEDAL_COLORS.silver} strokeWidth={2} dot={{ r: 4, fill: MEDAL_COLORS.silver }} connectNulls />
                    <Line type="monotone" dataKey="bronze" stroke={MEDAL_COLORS.bronze} strokeWidth={2} dot={{ r: 4, fill: MEDAL_COLORS.bronze }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RF prospects vs medal marks */}
      <Card>
        <CardHeader>
          <CardTitle>RF Prospects vs Medal Marks — {event}</CardTitle>
          <CardDescription>Gap to most recent bronze winning mark · negative = already at medal level</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-16 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : prospects.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">No RF athletes have results in this event</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left p-2">Athlete</th>
                    <th className="text-center p-2">Age</th>
                    <th className="text-right p-2">Best Mark</th>
                    <th className="text-right p-2">WA Score</th>
                    <th className="text-right p-2">Gap to Bronze</th>
                    <th className="text-left p-2">Medal Age Window</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p, i) => (
                    <tr key={i} className={`border-b hover:bg-muted/40 ${p.gapToBronze !== null && p.gapToBronze < 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : ""}`}>
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-center">{p.age ?? "—"}</td>
                      <td className="p-2 text-right font-mono">{p.bestMark}</td>
                      <td className="p-2 text-right">{p.bestScore}</td>
                      <td className={`p-2 text-right font-semibold ${p.gapToBronze === null ? "text-muted-foreground" : p.gapToBronze < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {p.gapToBronze !== null ? `${p.gapToBronze > 0 ? "+" : ""}${p.gapToBronze}%` : "No medal data"}
                      </td>
                      <td className="p-2">
                        {p.inMedalAgeWindow ? (
                          <Badge className="bg-emerald-600 text-white text-xs">In Window</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Outside Window</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {bronzeMark && (
            <p className="text-xs text-muted-foreground mt-3">
              Most recent bronze mark: <strong>{formatMark(bronzeMark, event)}</strong> ({winningMarksData[winningMarksData.length - 1]?.year})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Medal history log */}
      {medals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>RF Medal History</CardTitle>
            <CardDescription>{competition} · {event}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left p-2">Athlete</th>
                    <th className="text-left p-2">Competition</th>
                    <th className="text-left p-2">Discipline</th>
                    <th className="text-center p-2">Medal</th>
                    <th className="text-right p-2">Mark</th>
                    <th className="text-right p-2">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {medals.slice(0, 30).map((h, i) => {
                    const rank = medalRank(h.place);
                    const color = rank ? MEDAL_COLORS[rank] : "#94a3b8";
                    return (
                      <tr key={i} className="border-b hover:bg-muted/40">
                        <td className="p-2 font-medium">{athleteNameMap.get(h.aa_athlete_id) ?? h.aa_athlete_id}</td>
                        <td className="p-2 text-muted-foreground text-xs">{h.competition}</td>
                        <td className="p-2">{h.discipline}</td>
                        <td className="p-2 text-center">
                          <span style={{ color }} className="font-semibold capitalize">{rank ?? h.place}</span>
                        </td>
                        <td className="p-2 text-right font-mono">{h.mark ?? "—"}</td>
                        <td className="p-2 text-right text-muted-foreground">
                          {h.date ? new Date(h.date).getFullYear() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
