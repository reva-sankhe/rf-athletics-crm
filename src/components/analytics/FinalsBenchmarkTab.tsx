import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  fetchAllEventBenchmarks,
  fetchFinalistsForEvent,
  fetchWAAthleteProfiles,
  fetchWARFAthleteResults,
} from "@/lib/queries";
import type { EventBenchmark, WAResult, WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { normalizeEventName, classifyEvent } from "@/lib/eventUtils";
import { Medal, Target, Users, Zap } from "lucide-react";

const EVENTS = [
  "100m", "200m", "400m", "800m", "1500m", "5000m", "10000m",
  "110m Hurdles", "100m Hurdles", "400m Hurdles", "3000m Steeplechase",
  "Marathon",
  "High Jump", "Pole Vault", "Long Jump", "Triple Jump",
  "Shot Put", "Discus Throw", "Hammer Throw", "Javelin Throw",
  "Decathlon", "Heptathlon",
];

const GENDERS = [
  { value: "M", label: "Men" },
  { value: "W", label: "Women" },
];

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

function GapCell({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-muted-foreground">—</span>;
  if (gap <= 0)
    return <span className="font-semibold text-emerald-600">{gap.toFixed(1)}%</span>;
  if (gap <= 3)
    return <span className="font-semibold text-amber-500">+{gap.toFixed(1)}%</span>;
  return <span className="font-semibold text-rose-500">+{gap.toFixed(1)}%</span>;
}

export function FinalsBenchmarkTab() {
  const [benchmarks, setBenchmarks] = useState<EventBenchmark[]>([]);
  const [rfAthletes, setRfAthletes] = useState<WAAthleteProfile[]>([]);
  const [rfResults, setRfResults] = useState<WARFAthleteResult[]>([]);
  const [finalists, setFinalists] = useState<WAResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState("100m");
  const [gender, setGender] = useState("M");

  useEffect(() => {
    loadStaticData();
  }, []);

  useEffect(() => {
    loadFinalists();
  }, [gender]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStaticData() {
    setLoading(true);
    try {
      const [bm, ath, res] = await Promise.all([
        fetchAllEventBenchmarks(),
        fetchWAAthleteProfiles(),
        fetchWARFAthleteResults(undefined, 1000),
      ]);
      setBenchmarks(bm);
      setRfAthletes(ath);
      setRfResults(res);
    } catch (e) {
      console.error("FinalsBenchmarkTab load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadFinalists() {
    try {
      const waGender = gender === "W" ? "W" : "M";
      const data = await fetchFinalistsForEvent("All Major", waGender);
      setFinalists(data);
    } catch (e) {
      console.error("FinalsBenchmarkTab finalists error:", e);
    }
  }

  const eventNorm = normalizeEventName(event);
  const isHigherBetter = classifyEvent(event).direction === "higher_better";
  const benchmarkGender = gender === "W" ? "F" : "M";

  // Match event_benchmarks row for selected event + gender
  const benchmark = benchmarks.find(
    (b) =>
      normalizeEventName(b.event_name) === eventNorm &&
      b.gender === benchmarkGender
  );

  // Parse benchmark marks
  const agGold = parseMark(benchmark?.asian_games_gold_result ?? null, event);
  const agSilver = parseMark(benchmark?.asian_games_silver_result ?? null, event);
  const agBronze = parseMark(benchmark?.asian_games_bronze_result ?? null, event);
  const agQual = parseMark(benchmark?.asian_games_qual_standard ?? null, event);
  const cwgGold = parseMark(benchmark?.cwg_gold_result ?? null, event);
  const cwgSilver = parseMark(benchmark?.cwg_silver_result ?? null, event);
  const cwgBronze = parseMark(benchmark?.cwg_bronze_result ?? null, event);
  const cwgQual = parseMark(benchmark?.commonwealth_games_qual_standard ?? null, event);
  const olGold = parseMark(benchmark?.olympic_gold_result ?? null, event);
  const olSilver = parseMark(benchmark?.olympic_silver_result ?? null, event);
  const olBronze = parseMark(benchmark?.olympic_bronze_result ?? null, event);

  // 8th-place finals entry mark from wa_results
  // Try matching on both discipline and event fields
  const eventFinalists = finalists.filter((r) => {
    const dNorm = r.discipline ? normalizeEventName(r.discipline) : "";
    const eNorm = r.event ? normalizeEventName(r.event) : "";
    return dNorm === eventNorm || eNorm === eventNorm;
  });

  const eighthPlace = eventFinalists
    .filter((r) => {
      const p = parseInt(r.place.replace(/\D/g, ""));
      return p === 8;
    })
    .map((r) => parseMark(r.mark, event))
    .filter((v): v is number => v !== null);

  const finalsEntryVal =
    eighthPlace.length > 0
      ? isHigherBetter
        ? Math.max(...eighthPlace)
        : Math.min(...eighthPlace)
      : null;

  // Medal ages for computing median
  const medalAges = [
    benchmark?.asian_games_gold_age,
    benchmark?.asian_games_silver_age,
    benchmark?.asian_games_bronze_age,
    benchmark?.cwg_gold_age,
    benchmark?.cwg_silver_age,
    benchmark?.cwg_bronze_age,
    benchmark?.olympic_gold_age,
    benchmark?.olympic_silver_age,
    benchmark?.olympic_bronze_age,
  ].filter((a): a is number => typeof a === "number" && a > 0);

  const medianMedalAge =
    medalAges.length > 0
      ? [...medalAges].sort((a, b) => a - b)[Math.floor(medalAges.length / 2)]
      : null;

  // RF athletes with results in this event
  const rfProspects = rfAthletes
    .flatMap((athlete) => {
      const athResults = rfResults.filter(
        (r) =>
          r.aa_athlete_id === athlete.aa_athlete_id &&
          !r.not_legal &&
          normalizeEventName(r.discipline) === eventNorm
      );
      if (athResults.length === 0) return [];

      const best = athResults.reduce((b, r) =>
        r.result_score > b.result_score ? r : b
      );
      const athleteVal = parseMark(best.mark, event);

      return [
        {
          name: athlete.reliance_name,
          age: athlete.age,
          bestMark: best.mark,
          val: athleteVal,
          gapToAgBronze:
            athleteVal !== null && agBronze !== null
              ? calcGapPct(athleteVal, agBronze, event)
              : null,
          gapToAgGold:
            athleteVal !== null && agGold !== null
              ? calcGapPct(athleteVal, agGold, event)
              : null,
          gapToCwgBronze:
            athleteVal !== null && cwgBronze !== null
              ? calcGapPct(athleteVal, cwgBronze, event)
              : null,
          gapToEntry:
            athleteVal !== null && finalsEntryVal !== null
              ? calcGapPct(athleteVal, finalsEntryVal, event)
              : null,
        },
      ];
    })
    .sort((a, b) => (a.gapToAgBronze ?? 99) - (b.gapToAgBronze ?? 99));

  const rfInRange = rfProspects.filter(
    (p) => p.gapToAgBronze !== null && p.gapToAgBronze <= 5
  ).length;

  const hasBenchmarkData = agGold !== null || cwgGold !== null || olGold !== null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5 min-w-[160px]">
              <Label className="text-xs">Event</Label>
              <SearchableSelect
                value={event}
                onValueChange={setEvent}
                options={EVENTS.map((e) => ({ value: e, label: e }))}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Medal className="h-4 w-4 text-amber-500" /> AG Gold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatMark(agGold, event)}</p>
            <p className="text-xs text-muted-foreground mt-1">Asian Games gold mark</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" /> AG Bronze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatMark(agBronze, event)}</p>
            <p className="text-xs text-muted-foreground mt-1">Asian Games medal threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Medal Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{medianMedalAge ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">median age at medal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" /> RF Prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{rfInRange}</p>
            <p className="text-xs text-muted-foreground mt-1">within 5% of AG bronze</p>
          </CardContent>
        </Card>
      </div>

      {/* Medal Benchmark Reference Table */}
      <Card>
        <CardHeader>
          <CardTitle>Medal Benchmarks — {event}</CardTitle>
          <CardDescription>
            Gold, Silver, Bronze marks and athlete ages for major competitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              Loading…
            </div>
          ) : !hasBenchmarkData ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
              No benchmark data for {event} ({gender === "M" ? "Men" : "Women"})
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left p-2">Competition</th>
                    <th className="text-right p-2">
                      <span className="text-amber-500">Gold</span>
                    </th>
                    <th className="text-right p-2 text-muted-foreground">Age</th>
                    <th className="text-right p-2">Silver</th>
                    <th className="text-right p-2 text-muted-foreground">Age</th>
                    <th className="text-right p-2">Bronze</th>
                    <th className="text-right p-2 text-muted-foreground">Age</th>
                    <th className="text-right p-2 text-blue-500">Qual Std</th>
                  </tr>
                </thead>
                <tbody>
                  {agGold !== null && (
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">Asian Games</td>
                      <td className="p-2 text-right font-mono text-amber-600 font-semibold">
                        {formatMark(agGold, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.asian_games_gold_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatMark(agSilver, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.asian_games_silver_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatMark(agBronze, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.asian_games_bronze_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-blue-600">
                        {agQual !== null ? formatMark(agQual, event) : "—"}
                      </td>
                    </tr>
                  )}
                  {cwgGold !== null && (
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">Commonwealth Games</td>
                      <td className="p-2 text-right font-mono text-amber-600 font-semibold">
                        {formatMark(cwgGold, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.cwg_gold_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatMark(cwgSilver, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.cwg_silver_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatMark(cwgBronze, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.cwg_bronze_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-blue-600">
                        {cwgQual !== null ? formatMark(cwgQual, event) : "—"}
                      </td>
                    </tr>
                  )}
                  {olGold !== null && (
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">Olympics</td>
                      <td className="p-2 text-right font-mono text-amber-600 font-semibold">
                        {formatMark(olGold, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.olympic_gold_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatMark(olSilver, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.olympic_silver_age ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatMark(olBronze, event)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {benchmark?.olympic_bronze_age ?? "—"}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">—</td>
                    </tr>
                  )}
                  {finalsEntryVal !== null && (
                    <tr className="hover:bg-muted/30 bg-muted/10">
                      <td className="p-2 font-medium text-muted-foreground">Finals Entry (8th)</td>
                      <td
                        className="p-2 text-right font-mono text-muted-foreground font-semibold"
                        colSpan={7}
                      >
                        {formatMark(finalsEntryVal, event)}{" "}
                        <span className="font-normal text-xs">— slowest qualifier across major finals</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RF Athletes vs Benchmarks Table */}
      <Card>
        <CardHeader>
          <CardTitle>RF Athletes vs Benchmarks — {event}</CardTitle>
          <CardDescription>
            Gap to Asian Games and Commonwealth Games medal marks · negative = already at that level
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-16 flex items-center justify-center text-muted-foreground">
              Loading…
            </div>
          ) : rfProspects.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No RF athletes have results recorded for {event}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="text-left p-2">Athlete</th>
                      <th className="text-center p-2">Age</th>
                      <th className="text-right p-2">Best Mark</th>
                      <th className="text-right p-2">vs AG Bronze</th>
                      <th className="text-right p-2">vs AG Gold</th>
                      <th className="text-right p-2">vs CWG Bronze</th>
                      {finalsEntryVal !== null && (
                        <th className="text-right p-2">vs Finals Entry</th>
                      )}
                      <th className="text-center p-2">Age Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfProspects.map((p, i) => {
                      const ageStatus =
                        medianMedalAge !== null && p.age !== null
                          ? Math.abs(p.age - medianMedalAge) <= 4
                            ? "peak"
                            : p.age < medianMedalAge - 4
                            ? "developing"
                            : "veteran"
                          : null;
                      return (
                        <tr
                          key={i}
                          className={`border-b hover:bg-muted/40 ${
                            p.gapToAgBronze !== null && p.gapToAgBronze <= 0
                              ? "bg-emerald-50 dark:bg-emerald-950/20"
                              : ""
                          }`}
                        >
                          <td className="p-2 font-medium">{p.name}</td>
                          <td className="p-2 text-center text-muted-foreground">
                            {p.age ?? "—"}
                          </td>
                          <td className="p-2 text-right font-mono">{p.bestMark}</td>
                          <td className="p-2 text-right">
                            <GapCell
                              gap={
                                p.gapToAgBronze !== null
                                  ? parseFloat(p.gapToAgBronze.toFixed(1))
                                  : null
                              }
                            />
                          </td>
                          <td className="p-2 text-right">
                            <GapCell
                              gap={
                                p.gapToAgGold !== null
                                  ? parseFloat(p.gapToAgGold.toFixed(1))
                                  : null
                              }
                            />
                          </td>
                          <td className="p-2 text-right">
                            <GapCell
                              gap={
                                p.gapToCwgBronze !== null
                                  ? parseFloat(p.gapToCwgBronze.toFixed(1))
                                  : null
                              }
                            />
                          </td>
                          {finalsEntryVal !== null && (
                            <td className="p-2 text-right">
                              <GapCell
                                gap={
                                  p.gapToEntry !== null
                                    ? parseFloat(p.gapToEntry.toFixed(1))
                                    : null
                                }
                              />
                            </td>
                          )}
                          <td className="p-2 text-center">
                            {ageStatus === "peak" ? (
                              <Badge className="bg-emerald-600 text-white text-xs">
                                Peak Age
                              </Badge>
                            ) : ageStatus === "developing" ? (
                              <Badge className="bg-blue-500 text-white text-xs">
                                Developing
                              </Badge>
                            ) : ageStatus === "veteran" ? (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Veteran
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-6 text-xs text-muted-foreground mt-3 pt-3 border-t">
                {agBronze !== null && (
                  <span>
                    AG Bronze:{" "}
                    <strong className="text-foreground">{formatMark(agBronze, event)}</strong>
                  </span>
                )}
                {agGold !== null && (
                  <span>
                    AG Gold:{" "}
                    <strong className="text-amber-600">{formatMark(agGold, event)}</strong>
                  </span>
                )}
                {cwgBronze !== null && (
                  <span>
                    CWG Bronze:{" "}
                    <strong className="text-foreground">{formatMark(cwgBronze, event)}</strong>
                  </span>
                )}
                {finalsEntryVal !== null && (
                  <span>
                    Finals Entry:{" "}
                    <strong className="text-foreground">
                      {formatMark(finalsEntryVal, event)}
                    </strong>
                  </span>
                )}
                {medianMedalAge !== null && (
                  <span>
                    Median medal age:{" "}
                    <strong className="text-foreground">{medianMedalAge}</strong>{" "}
                    (±4 yrs = Peak Age)
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
