import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchWAToplists, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAToplist, WAAthleteProfile } from "@/lib/types";
import { TOPLIST_DISCIPLINE_GROUPS } from "@/lib/eventGroups";
import { Target, Star } from "lucide-react";

const EXTRA_RF_NAMES = new Set([
  "abhay singh", "anees", "anu raghavan", "atul", "devansh jagga",
  "dhairyasheel", "gaurav patel", "karishma s sanil", "lakshita",
  "md sinan", "murad sirman", "nived", "oshin", "poorva sawant",
  "poorna raorane", "rathish pandidurai", "sandeep gond", "shreyas jadhav",
  "sonia baishya", "surya p", "usman ali khan", "vikrant malik",
]);

export function ScoutingRadarTab() {
  const [gender, setGender] = useState("M");
  const [discipline, setDiscipline] = useState("100m");
  const [showRF, setShowRF] = useState(true);

  const genderPrefix = gender === "M" ? "Men's" : "Women's";
  const selectedEvent = `${genderPrefix} ${discipline}`;

  const { data: toplists = [], isFetching: toplistFetching } = useQuery<WAToplist[]>({
    queryKey: ["toplists", selectedEvent, gender, 200],
    queryFn: () => fetchWAToplists(selectedEvent, gender, 200),
  });
  const { data: rfAthletes = [] } = useQuery<WAAthleteProfile[]>({
    queryKey: ["athletes"],
    queryFn: fetchWAAthleteProfiles,
  });
  const loading = toplistFetching;

  function handleGenderChange(g: string) {
    setGender(g);
    const allEvents = (TOPLIST_DISCIPLINE_GROUPS[g] ?? TOPLIST_DISCIPLINE_GROUPS.M).flatMap(gr => gr.events);
    if (!allEvents.includes(discipline)) setDiscipline(allEvents[0]);
  }

  const rfNamesLower = new Set(rfAthletes.map(a => a.reliance_name.toLowerCase()));
  const isRF = (name: string) =>
    rfNamesLower.has(name.toLowerCase()) || EXTRA_RF_NAMES.has(name.toLowerCase());

  // Deduplicated RF athletes in this event, keeping best score per name
  const rfInEvent = Array.from(
    toplists
      .filter(t => isRF(t.athlete_name))
      .reduce((map, t) => {
        const key = t.athlete_name.toLowerCase();
        const cur = map.get(key);
        if (!cur || (parseInt(t.score) || 0) > (parseInt(cur.score) || 0))
          map.set(key, { name: t.athlete_name, score: parseInt(t.score) || 0, mark: t.mark, region: t.region });
        return map;
      }, new Map<string, { name: string; score: number; mark: string; region: string }>())
      .values()
  ).sort((a, b) => b.score - a.score);

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

  // Build interleaved table rows: scouts keep continuous rank, RF entries are positional markers
  type TableRow =
    | { type: "scout"; data: typeof scouts[0]; rank: number }
    | { type: "rf"; data: typeof rfInEvent[0] };

  const tableRows: TableRow[] = [];
  let rank = 0;
  let ri = 0;
  for (const scout of scouts) {
    while (ri < rfInEvent.length && rfInEvent[ri].score > scout.score) {
      tableRows.push({ type: "rf", data: rfInEvent[ri++] });
    }
    tableRows.push({ type: "scout", data: scout, rank: ++rank });
  }
  while (ri < rfInEvent.length) {
    tableRows.push({ type: "rf", data: rfInEvent[ri++] });
  }

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
              <Star className="h-4 w-4 text-emerald-500" /> RF Best Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rfBestScore !== null ? (
              <>
                <p className="text-3xl font-bold text-emerald-600">{rfBestScore}</p>
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

      {/* Full scouting table */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>All Scout Candidates</CardTitle>
              <CardDescription className="mt-1">All Indian non-RF athletes · {selectedEvent} · sorted by score</CardDescription>
            </div>
            <button
              onClick={() => setShowRF(v => !v)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                showRF
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {showRF ? "Hide RF athletes" : "Show RF athletes"}
            </button>
          </div>
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
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No non-RF Indian athletes found for this event
                    </td>
                  </tr>
                ) : tableRows.map((row, i) => {
                  if (row.type === "rf") {
                    if (!showRF) return null;
                    return (
                      <tr
                        key={`rf-${i}`}
                        className="border-b border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/15"
                      >
                        <td className="p-2">
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">RF</Badge>
                        </td>
                        <td className="p-2 font-medium text-emerald-700 dark:text-emerald-400">{row.data.name}</td>
                        <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{row.data.mark}</td>
                        <td className="p-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{row.data.score}</td>
                        <td className="p-2 text-right text-muted-foreground">—</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">{row.data.region}</Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">—</td>
                      </tr>
                    );
                  }
                  const s = row.data;
                  const isTarget = rfBestScore !== null && s.score >= rfBestScore;
                  return (
                    <tr
                      key={`scout-${i}`}
                      className={`border-b hover:bg-muted/40 ${isTarget ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                    >
                      <td className="p-2 text-muted-foreground">{row.rank}</td>
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
