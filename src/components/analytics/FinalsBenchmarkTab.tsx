import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchFinalistsForEvent, fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAResult, WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { normalizeEventName, classifyEvent } from "@/lib/eventUtils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Target, TrendingDown, Users, Zap } from "lucide-react";

const COMPETITIONS = ["All Major", "Asian Games", "Commonwealth Games", "World Championships"];
const EVENTS = [
  "100m", "200m", "400m", "800m", "1500m", "5000m", "10000m",
  "110m Hurdles", "100m Hurdles", "400m Hurdles", "3000m Steeplechase",
  "Marathon",
  "High Jump", "Pole Vault", "Long Jump", "Triple Jump",
  "Shot Put", "Discus Throw", "Hammer Throw", "Javelin Throw",
  "Decathlon", "Heptathlon",
];
const GENDERS = [
  { value: "All", label: "All" },
  { value: "M", label: "Men" },
  { value: "W", label: "Women" },
];

type FinalData = {
  year: number;
  gold: number | null;
  slowest: number | null;
  spread: number | null;
  ages: Array<{ age: number; isMedalist: boolean }>;
};

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
  return classifyEvent(event).direction === "lower_better"
    ? secondsToTime(val)
    : val.toFixed(2);
}

function calcGap(athleteVal: number, refVal: number, event: string): number {
  const direction = classifyEvent(event).direction;
  return direction === "lower_better"
    ? (athleteVal - refVal) / refVal * 100
    : (refVal - athleteVal) / refVal * 100;
}

export function FinalsBenchmarkTab() {
  const [allFinalists, setAllFinalists] = useState<WAResult[]>([]);
  const [rfAthletes, setRfAthletes] = useState<WAAthleteProfile[]>([]);
  const [rfResults, setRfResults] = useState<WARFAthleteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfLoading, setRfLoading] = useState(true);
  const [competition, setCompetition] = useState("All Major");
  const [event, setEvent] = useState("100m");
  const [gender, setGender] = useState("M");

  useEffect(() => { loadFinalists(); }, [competition, gender]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadRFData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFinalists() {
    setLoading(true);
    try {
      const data = await fetchFinalistsForEvent(
        competition,
        gender === "All" ? undefined : gender
      );
      setAllFinalists(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadRFData() {
    setRfLoading(true);
    try {
      const [ath, res] = await Promise.all([
        fetchWAAthleteProfiles(),
        fetchWARFAthleteResults(undefined, 500),
      ]);
      setRfAthletes(ath);
      setRfResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setRfLoading(false);
    }
  }

  const isHigherBetter = classifyEvent(event).direction === "higher_better";
  const eventNorm = normalizeEventName(event);

  // Filter all results to the selected event (client-side discipline match)
  const eventFinalists = allFinalists.filter(
    r => normalizeEventName(r.discipline) === eventNorm
  );

  // Group by competition_id — each competition is one championship edition
  const competitionGroups = new Map<number, WAResult[]>();
  eventFinalists.forEach(r => {
    const arr = competitionGroups.get(r.competition_id) ?? [];
    arr.push(r);
    competitionGroups.set(r.competition_id, arr);
  });

  // For each competition, reconstruct the final using best-mark-per-place heuristic:
  // within all heats+semis+final mixed together, the athlete at each place who ran
  // the best mark IS the finalist (finalists outperform heat runners at same place).
  const finalsDataRaw: FinalData[] = [];
  competitionGroups.forEach(compResults => {
    const year = new Date(compResults[0].race_date).getFullYear();

    // Build place → best result map (places 1-8 only)
    const bestPerPlace = new Map<number, { markVal: number; age: number }>();
    compResults.forEach(r => {
      const placeNum = parseInt(r.place.replace(/\D/g, ""));
      if (isNaN(placeNum) || placeNum < 1 || placeNum > 8) return;
      const markVal = parseMark(r.mark, event);
      if (markVal === null || isNaN(markVal)) return;
      const existing = bestPerPlace.get(placeNum);
      const isBetter = !existing ||
        (isHigherBetter ? markVal > existing.markVal : markVal < existing.markVal);
      if (isBetter) bestPerPlace.set(placeNum, { markVal, age: r.athlete_age });
    });

    if (bestPerPlace.size < 2) return;

    const goldEntry = bestPerPlace.get(1);
    if (!goldEntry) return;
    const lastPlace = Math.max(...bestPerPlace.keys());
    const lastEntry = bestPerPlace.get(lastPlace);
    if (!lastEntry) return;

    const spread = Math.abs(goldEntry.markVal - lastEntry.markVal) / Math.abs(goldEntry.markVal) * 100;
    const ages = Array.from(bestPerPlace.entries())
      .filter(([, v]) => v.age > 0 && v.age < 60)
      .map(([place, v]) => ({ age: v.age, isMedalist: place <= 3 }));

    finalsDataRaw.push({
      year,
      gold: goldEntry.markVal,
      slowest: lastEntry.markVal,
      spread: parseFloat(spread.toFixed(2)),
      ages,
    });
  });

  // One entry per year (in case multiple competitions of same type in same year)
  const yearMap = new Map<number, FinalData>();
  finalsDataRaw.forEach(d => {
    const existing = yearMap.get(d.year);
    if (!existing || d.ages.length > existing.ages.length) {
      yearMap.set(d.year, d);
    }
  });
  const finalsData = [...yearMap.values()].sort((a, b) => a.year - b.year);

  const allAges = finalsData.flatMap(d => d.ages);

  // Finals spread chart data
  const spreadChartData = finalsData.map(d => ({
    year: d.year,
    gold: d.gold,
    slowest: d.slowest,
    spread: d.spread,
    goldLabel: d.gold !== null ? formatMark(d.gold, event) : null,
    slowestLabel: d.slowest !== null ? formatMark(d.slowest, event) : null,
  }));

  // Age histogram
  const ageHistogram = Array.from({ length: 26 }, (_, i) => {
    const age = 15 + i;
    return {
      age,
      medallists: allAges.filter(a => a.age === age && a.isMedalist).length,
      finalists: allAges.filter(a => a.age === age && !a.isMedalist).length,
    };
  });

  // RF athlete current ages for reference lines
  const rfAthleteAges = rfAthletes
    .filter(a => a.age !== null)
    .map(a => ({ name: a.reliance_name, age: a.age! }));

  const latestFinal = finalsData[finalsData.length - 1];
  const goldMark = latestFinal?.gold ?? null;
  const finalsEntryMark = latestFinal?.slowest ?? null;

  const avgSpread =
    finalsData.length > 0
      ? parseFloat(
          (finalsData.reduce((s, d) => s + (d.spread ?? 0), 0) / finalsData.length).toFixed(1)
        )
      : null;

  // Median finalist age across all finals
  const sortedAgeVals = [...allAges].sort((a, b) => a.age - b.age);
  const medianAge =
    sortedAgeVals.length > 0
      ? sortedAgeVals[Math.floor(sortedAgeVals.length / 2)].age
      : null;

  // RF athlete comparison rows
  const rfProspects = rfAthletes
    .flatMap(athlete => {
      const athResults = rfResults.filter(
        r =>
          r.aa_athlete_id === athlete.aa_athlete_id &&
          !r.not_legal &&
          normalizeEventName(r.discipline) === eventNorm
      );
      if (athResults.length === 0) return [];

      const best = athResults.reduce((b, r) => (r.result_score > b.result_score ? r : b));
      const athleteVal = parseMark(best.mark, event);

      const gapToEntry =
        finalsEntryMark !== null && athleteVal !== null
          ? parseFloat(calcGap(athleteVal, finalsEntryMark, event).toFixed(2))
          : null;
      const gapToGold =
        goldMark !== null && athleteVal !== null
          ? parseFloat(calcGap(athleteVal, goldMark, event).toFixed(2))
          : null;
      const inAgeRange =
        medianAge !== null && athlete.age !== null
          ? Math.abs(athlete.age - medianAge) <= 4
          : null;

      return [
        {
          name: athlete.reliance_name,
          age: athlete.age,
          bestMark: best.mark,
          bestScore: best.result_score,
          gapToEntry,
          gapToGold,
          inAgeRange,
        },
      ];
    })
    .sort((a, b) => (a.gapToEntry ?? 99) - (b.gapToEntry ?? 99));

  const rfInRange = rfProspects.filter(p => p.gapToEntry !== null && p.gapToEntry <= 2).length;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" /> Finals Spread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {avgSpread !== null ? `${avgSpread}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">avg gap · Gold vs last finalist</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" /> Finals Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {finalsEntryMark !== null ? formatMark(finalsEntryMark, event) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              slowest qualifier · {latestFinal?.year ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Typical Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{medianAge ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">median finalist age</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" /> RF in Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{rfInRange}</p>
            <p className="text-xs text-muted-foreground mt-1">within 2% of finals entry</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs">Competition</Label>
              <SearchableSelect
                value={competition}
                onValueChange={setCompetition}
                options={COMPETITIONS.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs">Event</Label>
              <SearchableSelect
                value={event}
                onValueChange={setEvent}
                options={EVENTS.map(e => ({ value: e, label: e }))}
                searchPlaceholder="Search events…"
              />
            </div>
            <div className="space-y-1.5 min-w-[120px]">
              <Label className="text-xs">Gender</Label>
              <SearchableSelect
                value={gender}
                onValueChange={setGender}
                options={GENDERS}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finals Spread Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gold vs Finals Entry Mark — {event}</CardTitle>
          <CardDescription>
            Amber = Gold winner · Slate dashed = Slowest to qualify (8th place) · Blue lines = RF athlete best marks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : spreadChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No finals data for selected filters
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Gold
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block" style={{ borderTop: "2px dashed" }} /> Finals Entry (8th)
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={spreadChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => formatMark(v, event)}
                    reversed={!isHigherBetter}
                    domain={["auto", "auto"]}
                    width={56}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.year}</p>
                          {d.goldLabel && <p className="text-amber-500">Gold: {d.goldLabel}</p>}
                          {d.slowestLabel && <p className="text-slate-500">Finals Entry: {d.slowestLabel}</p>}
                          {d.spread !== null && <p className="text-muted-foreground">Spread: {d.spread}%</p>}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone" dataKey="gold" stroke="#f59e0b" strokeWidth={2}
                    dot={{ r: 4, fill: "#f59e0b" }} connectNulls name="Gold"
                  />
                  <Line
                    type="monotone" dataKey="slowest" stroke="#94a3b8" strokeWidth={2}
                    strokeDasharray="5 3" dot={{ r: 4, fill: "#94a3b8" }} connectNulls name="Finals Entry"
                  />
                  {rfProspects
                    .filter(p => p.bestMark)
                    .map(p => {
                      const val = parseMark(p.bestMark, event);
                      return val !== null ? (
                        <ReferenceLine
                          key={p.name}
                          y={val}
                          stroke="#3b82f6"
                          strokeDasharray="3 2"
                          strokeWidth={1.5}
                          label={{ value: p.name, position: "insideLeft", fontSize: 9, fill: "#3b82f6" }}
                        />
                      ) : null;
                    })}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Age Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Age Profile of Finalists — {event}</CardTitle>
          <CardDescription>
            Amber = Medallists (1st–3rd) · Slate = Other finalists (4th–8th) · Blue lines = current RF athlete ages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : allAges.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              No age data available for selected filters
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ageHistogram} barSize={14} barCategoryGap="8%">
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
                        {d.medallists > 0 && (
                          <p className="text-amber-500">{d.medallists} medallist appearance{d.medallists !== 1 ? "s" : ""}</p>
                        )}
                        {d.finalists > 0 && (
                          <p className="text-slate-500">{d.finalists} other finalist appearance{d.finalists !== 1 ? "s" : ""}</p>
                        )}
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
                <Bar dataKey="medallists" stackId="a" fill="#f59e0b" name="Medallists" />
                <Bar dataKey="finalists" stackId="a" fill="#94a3b8" radius={[2, 2, 0, 0]} name="Other Finalists" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* RF Athletes vs Finals Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>RF Athletes vs Finals Benchmarks — {event}</CardTitle>
          <CardDescription>
            Gaps vs most recent {competition} final
            {latestFinal ? ` (${latestFinal.year})` : ""} · negative = already at that level
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rfLoading || loading ? (
            <div className="h-16 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : rfProspects.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No RF athletes have results in this event
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left p-2">Athlete</th>
                    <th className="text-center p-2">Age</th>
                    <th className="text-right p-2">Best Mark</th>
                    <th className="text-right p-2">WA Score</th>
                    <th className="text-right p-2">Gap to Finals</th>
                    <th className="text-right p-2">Gap to Gold</th>
                    <th className="text-left p-2">Age Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rfProspects.map((p, i) => (
                    <tr
                      key={i}
                      className={`border-b hover:bg-muted/40 ${
                        p.gapToEntry !== null && p.gapToEntry <= 0
                          ? "bg-emerald-50 dark:bg-emerald-950/20"
                          : ""
                      }`}
                    >
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-center">{p.age ?? "—"}</td>
                      <td className="p-2 text-right font-mono">{p.bestMark}</td>
                      <td className="p-2 text-right">{p.bestScore}</td>
                      <td
                        className={`p-2 text-right font-semibold ${
                          p.gapToEntry === null
                            ? "text-muted-foreground"
                            : p.gapToEntry <= 0
                            ? "text-emerald-600"
                            : p.gapToEntry <= 2
                            ? "text-amber-600"
                            : "text-red-500"
                        }`}
                      >
                        {p.gapToEntry !== null
                          ? `${p.gapToEntry > 0 ? "+" : ""}${p.gapToEntry}%`
                          : "—"}
                      </td>
                      <td
                        className={`p-2 text-right font-semibold ${
                          p.gapToGold === null
                            ? "text-muted-foreground"
                            : p.gapToGold <= 0
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {p.gapToGold !== null
                          ? `${p.gapToGold > 0 ? "+" : ""}${p.gapToGold}%`
                          : "—"}
                      </td>
                      <td className="p-2">
                        {p.inAgeRange === true ? (
                          <Badge className="bg-emerald-600 text-white text-xs">In Range</Badge>
                        ) : p.inAgeRange === false ? (
                          <Badge variant="outline" className="text-xs">Outside Range</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {latestFinal && (
            <div className="flex flex-wrap gap-6 text-xs text-muted-foreground mt-3">
              {goldMark !== null && (
                <span>
                  Gold: <strong className="text-amber-600">{formatMark(goldMark, event)}</strong>
                </span>
              )}
              {finalsEntryMark !== null && (
                <span>
                  Finals Entry (8th): <strong>{formatMark(finalsEntryMark, event)}</strong>
                </span>
              )}
              {medianAge !== null && (
                <span>
                  Median finalist age: <strong>{medianAge}</strong> (±4 yrs = "In Range")
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
