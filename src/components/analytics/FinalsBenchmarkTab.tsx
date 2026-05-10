import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import {
  fetchAllEventBenchmarks,
  fetchWAAthleteProfiles,
  fetchWARFAthleteResults,
  fetchFinalistsForEvent,
} from "@/lib/queries";
import type { EventBenchmark, WAAthleteProfile, WARFAthleteResult, WAResult } from "@/lib/types";
import { BENCHMARK_EVENT_GROUPS } from "@/lib/eventGroups";
import { normalizeEventName, classifyEvent } from "@/lib/eventUtils";
import { Medal, Target, Users, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const GENDERS = [
  { value: "M", label: "Men" },
  { value: "W", label: "Women" },
];

const TOURNAMENTS = [
  { value: "AG",  label: "Asian Games" },
  { value: "CWG", label: "Commonwealth Games" },
  { value: "OL",  label: "Olympics" },
] as const;

type Tournament = typeof TOURNAMENTS[number]["value"];

function timeToSeconds(s: string): number {
  const parts = s.split(/[:.]/);
  if (parts.length === 3) return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 100;
  if (parts.length === 2) return parseInt(parts[0]) + parseInt(parts[1]) / 100;
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

function parseMark(mark: string | null, event: string): number | null {
  if (!mark || mark === "—") return null;
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

function formatMark(val: number | null, event: string): string {
  if (val === null) return "—";
  return classifyEvent(event).direction === "lower_better" ? secondsToTime(val) : val.toFixed(2);
}

function calcGapPct(athleteVal: number, refVal: number, event: string): number {
  const direction = classifyEvent(event).direction;
  return direction === "lower_better"
    ? ((athleteVal - refVal) / refVal) * 100
    : ((refVal - athleteVal) / refVal) * 100;
}

// Returns positive when athleteVal is BETTER than baseVal (used for progress-style chart)
function progressPct(athleteVal: number, baseVal: number, event: string): number {
  return -calcGapPct(athleteVal, baseVal, event);
}


export function FinalsBenchmarkTab() {
  const [event, setEvent] = useState("100m");
  const [gender, setGender] = useState("M");
  const [tournament, setTournament] = useState<Tournament>("AG");

  // Derived constants needed in query keys — must come before useQuery hooks
  const benchmarkGender = gender === "W" ? "F" : "M";
  const competitionFilter =
    tournament === "AG" ? "Asian Games"
    : tournament === "CWG" ? "Commonwealth Games"
    : "Olympics";

  const { data: benchmarks = [], isLoading: bmLoading } = useQuery<EventBenchmark[]>({
    queryKey: ["benchmarks"],
    queryFn: fetchAllEventBenchmarks,
  });
  const { data: rfAthletes = [], isLoading: athletesLoading } = useQuery<WAAthleteProfile[]>({
    queryKey: ["athletes"],
    queryFn: () => fetchWAAthleteProfiles(),
  });
  const { data: rfResults = [], isLoading: resultsLoading } = useQuery<WARFAthleteResult[]>({
    queryKey: ["rf-results-2026"],
    queryFn: () => fetchWARFAthleteResults(undefined, 1000, 2026),
  });
  const { data: finalistsRaw = [] } = useQuery<WAResult[]>({
    queryKey: ["finalists", competitionFilter, benchmarkGender],
    queryFn: () => fetchFinalistsForEvent(competitionFilter, benchmarkGender),
  });
  const loading = bmLoading || athletesLoading || resultsLoading;

  const eventNorm = normalizeEventName(event);
  const isHigherBetter = classifyEvent(event).direction === "higher_better";

  const benchmark = benchmarks.find(
    (b) => normalizeEventName(b.event_name) === eventNorm && b.gender === benchmarkGender
  );

  const agGold   = parseMark(benchmark?.asian_games_gold_result   ?? null, event);
  const agSilver = parseMark(benchmark?.asian_games_silver_result ?? null, event);
  const agBronze = parseMark(benchmark?.asian_games_bronze_result ?? null, event);
  const agQual   = parseMark(benchmark?.asian_games_qual_standard ?? null, event);
  const cwgGold   = parseMark(benchmark?.cwg_gold_result   ?? null, event);
  const cwgSilver = parseMark(benchmark?.cwg_silver_result ?? null, event);
  const cwgBronze = parseMark(benchmark?.cwg_bronze_result ?? null, event);
  const cwgQual   = parseMark(benchmark?.commonwealth_games_qual_standard ?? null, event);
  const olGold   = parseMark(benchmark?.olympic_gold_result   ?? null, event);
  const olSilver = parseMark(benchmark?.olympic_silver_result ?? null, event);
  const olBronze = parseMark(benchmark?.olympic_bronze_result ?? null, event);

  // Active tournament reference marks
  const refBronze = tournament === "AG" ? agBronze : tournament === "CWG" ? cwgBronze : olBronze;
  const refSilver = tournament === "AG" ? agSilver : tournament === "CWG" ? cwgSilver : olSilver;
  const refGold   = tournament === "AG" ? agGold   : tournament === "CWG" ? cwgGold   : olGold;
  const refQual   = tournament === "AG" ? agQual   : tournament === "CWG" ? cwgQual   : null;
  const refLabel  = tournament === "AG" ? "Asian Games" : tournament === "CWG" ? "Commonwealth Games" : "Olympics";
  const refShort  = tournament === "AG" ? "AG" : tournament === "CWG" ? "CWG" : "OL";

  // Base for the progress chart: qual std if available, otherwise bronze
  const refBase = refQual ?? refBronze;

  // Reference line positions as % progress from refBase (positive = better)
  const bronzePos = refBase !== null && refBronze !== null && refBase !== refBronze
    ? parseFloat(progressPct(refBronze, refBase, event).toFixed(1))
    : refBase !== null && refBronze !== null ? 0 : null;
  const silverPos = refBase !== null && refSilver !== null
    ? parseFloat(progressPct(refSilver, refBase, event).toFixed(1))
    : null;
  const goldPos = refBase !== null && refGold !== null
    ? parseFloat(progressPct(refGold, refBase, event).toFixed(1))
    : null;
  const showQualLine = refQual !== null;

  // Medal age: range + median for selected tournament
  const medalAges = (
    tournament === "AG"
      ? [benchmark?.asian_games_gold_age, benchmark?.asian_games_silver_age, benchmark?.asian_games_bronze_age]
      : tournament === "CWG"
      ? [benchmark?.cwg_gold_age, benchmark?.cwg_silver_age, benchmark?.cwg_bronze_age]
      : [benchmark?.olympic_gold_age, benchmark?.olympic_silver_age, benchmark?.olympic_bronze_age]
  ).filter((a): a is number => typeof a === "number" && a > 0);

  const medianMedalAge =
    medalAges.length > 0
      ? [...medalAges].sort((a, b) => a - b)[Math.floor(medalAges.length / 2)]
      : null;
  const minMedalAge = medalAges.length > 0 ? Math.min(...medalAges) : null;
  const maxMedalAge = medalAges.length > 0 ? Math.max(...medalAges) : null;

  // ── RF Athletes: find best 2026 result by actual parsed mark value ──────────
  const rfProspects = rfAthletes
    .filter((athlete) => athlete.gender === benchmarkGender)
    .flatMap((athlete) => {
      const athResults = rfResults.filter(
        (r) => r.aa_athlete_id === athlete.aa_athlete_id &&
               !r.not_legal &&
               normalizeEventName(r.discipline) === eventNorm
      );
      if (athResults.length === 0) return [];

      // Pick best result by actual performance value, not score
      let bestResult = athResults[0];
      let bestVal = parseMark(athResults[0].mark, event);
      for (const r of athResults.slice(1)) {
        const val = parseMark(r.mark, event);
        if (val !== null && (bestVal === null ||
            (isHigherBetter ? val > bestVal : val < bestVal))) {
          bestResult = r;
          bestVal = val;
        }
      }

      return [{
        name: athlete.reliance_name,
        age: athlete.age,
        bestMark: bestResult.mark,
        val: bestVal,
        gapToBronze:
          bestVal !== null && refBronze !== null
            ? parseFloat(calcGapPct(bestVal, refBronze, event).toFixed(1))
            : null,
      }];
    })
    .sort((a, b) => (a.gapToBronze ?? 99) - (b.gapToBronze ?? 99));

  const rfInRange = rfProspects.filter(
    (p) => p.gapToBronze !== null && p.gapToBronze <= 5
  ).length;

  const hasBenchmarkData = agGold !== null || cwgGold !== null || olGold !== null;

  const barChartData = rfProspects
    .filter((p) => p.val !== null && refBase !== null)
    .map((p) => ({
      name: p.name,
      progress: parseFloat(progressPct(p.val!, refBase!, event).toFixed(1)),
      gapToBronze: p.gapToBronze,
      gapToSilver: p.val !== null && refSilver !== null
        ? parseFloat(calcGapPct(p.val, refSilver, event).toFixed(1)) : null,
      gapToGold: p.val !== null && refGold !== null
        ? parseFloat(calcGapPct(p.val, refGold, event).toFixed(1)) : null,
      gapToQual: p.val !== null && refQual !== null
        ? parseFloat(calcGapPct(p.val, refQual, event).toFixed(1)) : null,
      mark: p.bestMark,
      age: p.age,
    }));

  // Bell curve: historical medal age distribution for selected tournament + event
  const medalistAges = finalistsRaw
    .filter(
      (r) =>
        (parseInt(r.place) >= 1 && parseInt(r.place) <= 3) &&
        normalizeEventName(r.discipline) === eventNorm &&
        r.athlete_age > 0
    )
    .map((r) => Math.round(r.athlete_age));

  const ageBuckets: Record<number, number> = {};
  for (const age of medalistAges) {
    ageBuckets[age] = (ageBuckets[age] ?? 0) + 1;
  }
  const bellCurveData = Object.entries(ageBuckets)
    .map(([age, count]) => ({ age: Number(age), count }))
    .sort((a, b) => a.age - b.age);

  const rfAgesForBell = rfProspects
    .filter((p) => p.age !== null && p.age > 0)
    .map((p) => ({ name: p.name, age: p.age as number }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <div className="flex gap-1">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGender(g.value)}
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
                value={event}
                onValueChange={setEvent}
                groups={BENCHMARK_EVENT_GROUPS.map((g) => ({
                  label: g.label,
                  options: g.events.map((e) => ({ value: e, label: e })),
                }))}
                searchPlaceholder="Search events…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Competition</Label>
              <div className="flex gap-1">
                {TOURNAMENTS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTournament(t.value)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      tournament === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> RF in Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{rfProspects.length}</p>
            <p className="text-xs text-muted-foreground mt-1">athletes with 2026 results</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" /> Within Reach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{rfInRange}</p>
            <p className="text-xs text-muted-foreground mt-1">
              within 5% of {refShort} bronze
              {rfProspects.length > 0 && ` · of ${rfProspects.length}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" /> {refShort} Bronze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatMark(refBronze, event)}</p>
            <p className="text-xs text-muted-foreground mt-1">{refLabel} medal threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Medal className="h-4 w-4 text-blue-500" /> Medal Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{medianMedalAge ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {minMedalAge !== null && maxMedalAge !== null && minMedalAge !== maxMedalAge
                ? `range: ${minMedalAge}–${maxMedalAge} · median`
                : "median age at medal"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Medal Benchmark Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Medal Benchmarks — {event}</CardTitle>
          <CardDescription>Gold and Bronze marks for major championships</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-16 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : !hasBenchmarkData ? (
            <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">
              No benchmark data for {event} ({gender === "M" ? "Men" : "Women"})
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left p-2">Competition</th>
                    <th className="text-right p-2 text-amber-500">Gold</th>
                    <th className="text-right p-2 text-gray-400">Silver</th>
                    <th className="text-right p-2">Bronze</th>
                    <th className="text-right p-2 text-blue-500">Qual Std</th>
                  </tr>
                </thead>
                <tbody>
                  {agGold !== null && (
                    <tr className={`border-b hover:bg-muted/30 ${tournament === "AG" ? "bg-primary/5 font-medium" : ""}`}>
                      <td className="p-2 font-medium">Asian Games {tournament === "AG" && <span className="ml-1 text-xs text-primary">●</span>}</td>
                      <td className="p-2 text-right font-mono text-amber-600 font-semibold">{formatMark(agGold, event)}</td>
                      <td className="p-2 text-right font-mono text-muted-foreground">{formatMark(agSilver, event)}</td>
                      <td className="p-2 text-right font-mono">{formatMark(agBronze, event)}</td>
                      <td className="p-2 text-right font-mono text-blue-600">{agQual !== null ? formatMark(agQual, event) : "—"}</td>
                    </tr>
                  )}
                  {cwgGold !== null && (
                    <tr className={`border-b hover:bg-muted/30 ${tournament === "CWG" ? "bg-primary/5 font-medium" : ""}`}>
                      <td className="p-2 font-medium">Commonwealth Games {tournament === "CWG" && <span className="ml-1 text-xs text-primary">●</span>}</td>
                      <td className="p-2 text-right font-mono text-amber-600 font-semibold">{formatMark(cwgGold, event)}</td>
                      <td className="p-2 text-right font-mono text-muted-foreground">{formatMark(cwgSilver, event)}</td>
                      <td className="p-2 text-right font-mono">{formatMark(cwgBronze, event)}</td>
                      <td className="p-2 text-right font-mono text-blue-600">{cwgQual !== null ? formatMark(cwgQual, event) : "—"}</td>
                    </tr>
                  )}
                  {olGold !== null && (
                    <tr className={`hover:bg-muted/30 ${tournament === "OL" ? "bg-primary/5 font-medium" : ""}`}>
                      <td className="p-2 font-medium">Olympics {tournament === "OL" && <span className="ml-1 text-xs text-primary">●</span>}</td>
                      <td className="p-2 text-right font-mono text-amber-600 font-semibold">{formatMark(olGold, event)}</td>
                      <td className="p-2 text-right font-mono text-muted-foreground">{formatMark(olSilver, event)}</td>
                      <td className="p-2 text-right font-mono">{formatMark(olBronze, event)}</td>
                      <td className="p-2 text-right text-muted-foreground">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medal Age Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Medal Age Distribution — {refLabel}</CardTitle>
          <CardDescription>
            Historical age of {refLabel} medalists in {event} · amber lines = RF athletes' current age
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bellCurveData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No historical medalist data for {event} ({refLabel})
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={bellCurveData}
                margin={{ top: 24, right: 20, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Age", position: "insideBottom", offset: -10, fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  width={28}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
                        <p>Age {d.age}: <span className="font-bold">{d.count} medalist{d.count !== 1 ? "s" : ""}</span></p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill="#94a3b8" radius={[3, 3, 0, 0]} barSize={20} />
                {rfAgesForBell.map((rf, i) => (
                  <ReferenceLine
                    key={rf.name}
                    x={rf.age}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    label={{
                      value: rf.name.split(" ")[0],
                      position: i % 2 === 0 ? "insideTopRight" : "insideTopLeft",
                      fontSize: 9,
                      fill: "#f59e0b",
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Progress chart: Qual Std → Bronze → Silver → Gold */}
      {refBase !== null && barChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2026 Performance vs {refLabel} Standards</CardTitle>
            <CardDescription>
              Each bar shows how far the athlete has progressed through {refLabel} milestones · right = closer to gold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(120, barChartData.length * 32 + 60)}>
              <BarChart
                data={barChartData}
                layout="vertical"
                margin={{ top: 8, right: 50, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                  tick={{ fontSize: 11 }}
                  label={{ value: showQualLine ? "% above Qual Std →" : "% above Bronze →", position: "insideBottom", offset: -12, fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={130}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;

                    let gapText: string | null = null;
                    let gapColor = "text-rose-500 font-medium";

                    if (d.gapToBronze !== null) {
                      if (d.gapToBronze > 0) {
                        // Below bronze
                        if (d.gapToQual !== null && d.gapToQual > 0) {
                          gapText = `${d.gapToQual.toFixed(1)}% from Qual Std`;
                          gapColor = "text-rose-500 font-medium";
                        } else {
                          gapText = `${d.gapToBronze.toFixed(1)}% from ${refShort} Bronze`;
                          gapColor = d.gapToBronze <= 5 ? "text-amber-500 font-medium" : "text-rose-500 font-medium";
                        }
                      } else {
                        // At or above bronze
                        if (d.gapToSilver !== null && d.gapToSilver > 0) {
                          // Below silver
                          gapText = `${d.gapToSilver.toFixed(1)}% from ${refShort} Silver`;
                          gapColor = "text-amber-500 font-medium";
                        } else if (d.gapToSilver !== null && d.gapToSilver <= 0) {
                          // At or above silver
                          if (d.gapToGold !== null && d.gapToGold > 0) {
                            gapText = `${d.gapToGold.toFixed(1)}% from ${refShort} Gold`;
                            gapColor = "text-emerald-600 font-medium";
                          } else {
                            gapText = `${Math.abs(d.gapToGold ?? d.gapToSilver).toFixed(1)}% above ${d.gapToGold !== null && d.gapToGold <= 0 ? `${refShort} Gold` : `${refShort} Silver`}`;
                            gapColor = "text-emerald-600 font-medium";
                          }
                        } else {
                          // No silver data — just show above bronze
                          gapText = `${Math.abs(d.gapToBronze).toFixed(1)}% above ${refShort} Bronze`;
                          gapColor = "text-emerald-600 font-medium";
                        }
                      }
                    }

                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm space-y-1">
                        <p className="font-semibold">{d.name}</p>
                        <p className="font-mono text-muted-foreground">{d.mark}</p>
                        {d.age && <p className="text-muted-foreground">Age: {d.age}</p>}
                        {gapText && <p className={gapColor}>{gapText}</p>}
                      </div>
                    );
                  }}
                />
                {/* Qual Std at x=0 when it's the base */}
                {showQualLine && (
                  <ReferenceLine
                    x={0}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    label={{ value: "Qual Std", position: "insideTopRight", fontSize: 10, fill: "#3b82f6" }}
                  />
                )}
                {/* Bronze line */}
                {bronzePos !== null && (
                  <ReferenceLine
                    x={showQualLine ? bronzePos : 0}
                    stroke="#f97316"
                    strokeWidth={2}
                    label={{ value: "Bronze", position: "insideTopRight", fontSize: 10, fill: "#f97316" }}
                  />
                )}
                {silverPos !== null && (
                  <ReferenceLine
                    x={silverPos}
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    label={{ value: "Silver", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
                  />
                )}
                {goldPos !== null && (
                  <ReferenceLine
                    x={goldPos}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    label={{ value: "Gold", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
                  />
                )}
                <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={16}>
                  {barChartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.gapToBronze === null ? "#94a3b8"
                        : d.gapToBronze <= 0 ? "#10b981"
                        : d.gapToBronze <= 5 ? "#f59e0b"
                        : "#f43f5e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t mt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> At or above {refShort} Bronze</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Within 5% of Bronze</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" /> More than 5% away</span>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
