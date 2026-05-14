import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchWAQualificationStandards,
  fetchWARFAthleteResults,
  fetchWAAthleteProfiles,
  fetchAllMainAthleteEvents,
  fetchAllRFAthletePBs,
} from "@/lib/queries";
import type {
  WAQualificationStandard,
  WARFAthleteResult,
  WAAthleteProfile,
  AthleteEvent,
  WAAthletePersonalBest,
} from "@/lib/types";
import { normalizeEventName, classifyEvent } from "@/lib/eventUtils";
import { isEventMatch } from "@/lib/eventUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import { CheckCircle2, AlertCircle, BarChart2, Info } from "lucide-react";

// All events with standards in the DB
const QUAL_EVENTS = [
  "100m", "200m", "400m", "800m", "1500m", "5000m", "10000m",
  "110m Hurdles", "100m Hurdles", "400m Hurdles", "3000m Steeplechase",
  "Marathon", "Race Walk",
  "4x100m Relay", "4x400m Relay", "4x400m Mixed Relay",
  "High Jump", "Pole Vault", "Long Jump", "Triple Jump",
  "Shot Put", "Discus Throw", "Hammer Throw", "Javelin Throw",
  "Decathlon", "Heptathlon",
];

const EVENT_GROUPS = [
  { label: "Track", events: ["100m", "200m", "400m", "800m", "1500m", "5000m", "10000m"] },
  { label: "Hurdles / Steeplechase", events: ["110m Hurdles", "100m Hurdles", "400m Hurdles", "3000m Steeplechase"] },
  { label: "Road", events: ["Marathon", "Race Walk"] },
  { label: "Relays", events: ["4x100m Relay", "4x400m Relay", "4x400m Mixed Relay"] },
  { label: "Jumps", events: ["High Jump", "Pole Vault", "Long Jump", "Triple Jump"] },
  { label: "Throws", events: ["Shot Put", "Discus Throw", "Hammer Throw", "Javelin Throw"] },
  { label: "Combined", events: ["Decathlon", "Heptathlon"] },
];

function timeToSeconds(s: string): number {
  const parts = s.split(/[:.]/).map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 100;
  if (parts.length === 2) return parts[0] + parts[1] / 100;
  return parseFloat(s);
}

// Strip parenthetical qualifiers before normalizing (e.g. "Men's Discus Throw (1.75kg)")
function normDisc(s: string): string {
  return normalizeEventName(s.replace(/\s*\([^)]*\)/g, ""));
}

/** Parse a mark string into a numeric value for chart / comparison */
function parseMarkNum(mark: string, event: string): number | null {
  const cleaned = mark.replace(/\s*\([^)]*\)/g, "").trim();
  const direction = classifyEvent(event).direction;
  if (direction === "lower_better") {
    const t = cleaned.replace(/[^0-9:.]/g, "");
    if (!t) return null;
    const val = timeToSeconds(t);
    return isNaN(val) ? null : val;
  } else {
    const val = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
    return isNaN(val) ? null : val;
  }
}

/** Format a raw numeric value back to a human-readable mark for axis ticks */
function formatAxisTick(value: number, event: string): string {
  const direction = classifyEvent(event).direction;
  if (direction === "lower_better") {
    if (value >= 3600) {
      const h = Math.floor(value / 3600);
      const m = Math.floor((value % 3600) / 60);
      const s = value % 60;
      return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
    }
    if (value >= 60) {
      const mins = Math.floor(value / 60);
      const secs = value % 60;
      return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
    }
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

function calcGap(athleteMark: number, standardMark: number, event: string): number {
  const direction = classifyEvent(event).direction;
  if (direction === "lower_better") {
    return (athleteMark - standardMark) / standardMark * 100;
  } else {
    return (standardMark - athleteMark) / standardMark * 100;
  }
}

type Status = "both" | "qualified_ag" | "qualified_cwg" | "close_ag" | "close_cwg" | "in_progress";

interface QualRow {
  athleteId: string;
  athleteName: string;
  gender: string;
  event: string;
  bestMark: string;
  markNum: number;          // absolute numeric value for charting (2026 season best)
  bestScore: number;
  pbMark: string | null;    // all-time personal best mark string
  pbNum: number | null;     // all-time personal best numeric value
  agStandard: string | null;
  agStdNum: number | null;  // parsed numeric standard
  agGap: number | null;
  cwgStandard: string | null;
  cwgStdNum: number | null; // parsed numeric standard
  cwgGap: number | null;
  status: Status;
}

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "both":         return <Badge className="bg-emerald-600 text-white text-xs">Reached AG-Q + CWG-Q</Badge>;
    case "qualified_ag": return <Badge className="bg-emerald-600 text-white text-xs">Reached AG-Q</Badge>;
    case "qualified_cwg":return <Badge className="bg-blue-600 text-white text-xs">Reached CWG-Q</Badge>;
    case "close_ag":     return <Badge className="bg-amber-500 text-white text-xs">Close to AG-Q</Badge>;
    case "close_cwg":    return <Badge className="bg-orange-400 text-white text-xs">Close to CWG-Q</Badge>;
    case "in_progress":  return <Badge variant="outline" className="text-xs">In Progress</Badge>;
  }
}

/** Bar fill colour based on qualification status */
function barColor(status: Status): string {
  switch (status) {
    case "both":
    case "qualified_ag":  return "#10b981"; // emerald
    case "qualified_cwg": return "#3b82f6"; // blue
    case "close_ag":      return "#f59e0b"; // amber
    case "close_cwg":     return "#fb923c"; // orange
    default:              return "#9ca3af"; // muted grey
  }
}

export function QualificationTrackerTab() {
  const { data: rawStandards = [], isLoading: stdsLoading } = useQuery<WAQualificationStandard[]>({
    queryKey: ["qual-standards"],
    queryFn: fetchWAQualificationStandards,
  });
  const { data: results = [], isLoading: resultsLoading } = useQuery<WARFAthleteResult[]>({
    queryKey: ["rf-results-2026"],
    queryFn: () => fetchWARFAthleteResults(undefined, 2000, 2026),
  });
  const { data: athletes = [], isLoading: athletesLoading } = useQuery<WAAthleteProfile[]>({
    queryKey: ["athletes"],
    queryFn: () => fetchWAAthleteProfiles(),
  });
  const { data: mainEvents = [], isLoading: mainEventsLoading } = useQuery<AthleteEvent[]>({
    queryKey: ["main-athlete-events"],
    queryFn: fetchAllMainAthleteEvents,
  });
  const { data: allPBs = [], isLoading: pbsLoading } = useQuery<WAAthletePersonalBest[]>({
    queryKey: ["all-athlete-pbs"],
    queryFn: fetchAllRFAthletePBs,
  });

  const loading = stdsLoading || resultsLoading || athletesLoading || mainEventsLoading || pbsLoading;
  const standards = useMemo(() => rawStandards.filter(s => s.year === 2026), [rawStandards]);

  // Build a map: aa_athlete_id → normalized main event name (stripped of gender prefix)
  const mainEventMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of mainEvents) {
      map.set(e.aa_athlete_id, normDisc(e.event_name));
    }
    return map;
  }, [mainEvents]);

  // Build a map: aa_athlete_id → raw main event_name (for PB matching via isEventMatch)
  const mainEventRawMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of mainEvents) {
      map.set(e.aa_athlete_id, e.event_name);
    }
    return map;
  }, [mainEvents]);

  // Build a map: aa_athlete_id → best PB for main event
  const pbMap = useMemo(() => {
    const map = new Map<string, WAAthletePersonalBest>();
    for (const pb of allPBs) {
      if (!pb.discipline || !pb.mark) continue;
      const rawMainEvent = mainEventRawMap.get(pb.aa_athlete_id);
      if (!rawMainEvent) continue;
      if (!isEventMatch(pb.discipline, rawMainEvent)) continue;
      // Keep the entry (first match per athlete — PBs table typically has one row per discipline)
      if (!map.has(pb.aa_athlete_id)) {
        map.set(pb.aa_athlete_id, pb);
      }
    }
    return map;
  }, [allPBs, mainEventRawMap]);

  const [filterEvent, setFilterEvent] = useState("all");
  const [filterGender, setFilterGender] = useState("all");

  const rows: QualRow[] = athletes.flatMap((athlete: WAAthleteProfile) => {
    const gender = athlete.gender || "M";

    // Only process the athlete's single main event
    const mainEventNorm = mainEventMap.get(athlete.aa_athlete_id);
    if (!mainEventNorm) return [];

    // Find the matching QUAL_EVENTS entry (needed for standards lookup by exact label)
    const event = QUAL_EVENTS.find(e => normDisc(e) === mainEventNorm);
    if (!event) return [];

    const athResults = results.filter(
      (r: WARFAthleteResult) => r.aa_athlete_id === athlete.aa_athlete_id &&
        !r.not_legal &&
        normDisc(r.discipline) === mainEventNorm
    );
    if (athResults.length === 0) return [];

    const best = athResults.reduce((b: WARFAthleteResult, r: WARFAthleteResult) =>
      r.result_score > b.result_score ? r : b
    );
    const agStd = standards.find(s => s.competition === "Asian Games" && s.event === event && s.gender === gender);
    const cwgStd = standards.find(s => s.competition === "Commonwealth Games" && s.event === event && s.gender === gender);

    const markNum = parseMarkNum(best.mark, event);
    if (markNum === null) return [];

    // Personal best (all-time)
    const pbEntry = pbMap.get(athlete.aa_athlete_id);
    const pbMark = pbEntry?.mark ?? null;
    const pbNum = pbMark ? parseMarkNum(pbMark, event) : null;

    const agStdNum = agStd ? parseMarkNum(agStd.standard, event) : null;
    const cwgStdNum = cwgStd ? parseMarkNum(cwgStd.standard, event) : null;

    const agGap = agStdNum !== null
      ? parseFloat(calcGap(markNum, agStdNum, event).toFixed(2))
      : null;
    const cwgGap = cwgStdNum !== null
      ? parseFloat(calcGap(markNum, cwgStdNum, event).toFixed(2))
      : null;

    const qualAG = agGap !== null && agGap < 0;
    const qualCWG = cwgGap !== null && cwgGap < 0;
    const closeAG = !qualAG && agGap !== null && agGap < 2;
    const closeCWG = !qualCWG && cwgGap !== null && cwgGap < 2;

    const status: Status =
      qualAG && qualCWG ? "both" :
      qualAG ? "qualified_ag" :
      qualCWG ? "qualified_cwg" :
      closeAG ? "close_ag" :
      closeCWG ? "close_cwg" :
      "in_progress";

    return [{
      athleteId: athlete.aa_athlete_id,
      athleteName: athlete.reliance_name,
      gender,
      event,
      bestMark: best.mark,
      markNum,
      bestScore: best.result_score,
      pbMark,
      pbNum: pbNum ?? null,
      agStandard: agStd?.standard ?? null,
      agStdNum: agStdNum ?? null,
      agGap,
      cwgStandard: cwgStd?.standard ?? null,
      cwgStdNum: cwgStdNum ?? null,
      cwgGap,
      status,
    }];
  });

  // Table respects both filters
  const filtered = rows.filter(r => {
    if (filterEvent !== "all" && r.event !== filterEvent) return false;
    if (filterGender !== "all" && r.gender !== filterGender) return false;
    return true;
  });

  // Tiles reflect current filters
  const qualifiedAGSet = new Set(filtered.filter(r => r.status === "qualified_ag" || r.status === "both").map(r => r.athleteId));
  const qualifiedCWGSet = new Set(filtered.filter(r => r.status === "qualified_cwg" || r.status === "both").map(r => r.athleteId));
  const closeAGCount = filtered.filter(r => r.agGap !== null && r.agGap >= 0 && r.agGap < 2).length;
  const closeCWGCount = filtered.filter(r => r.cwgGap !== null && r.cwgGap >= 0 && r.cwgGap < 2).length;

  // Chart — only rendered when a specific event is selected
  const direction = filterEvent !== "all" ? classifyEvent(filterEvent).direction : "lower_better";

  const chartRows = filterEvent !== "all"
    ? rows
        .filter(r => r.event === filterEvent && (filterGender === "all" || r.gender === filterGender))
        .sort((a, b) =>
          direction === "lower_better"
            ? a.markNum - b.markNum   // fastest first (smallest value)
            : b.markNum - a.markNum   // farthest first (largest value)
        )
    : [];

  // Derive a single agStdNum / cwgStdNum for reference lines from the first row that has it
  const refAgStdNum = chartRows.find(r => r.agStdNum !== null)?.agStdNum ?? null;
  const refAgStdLabel = chartRows.find(r => r.agStandard !== null)?.agStandard ?? null;
  const refCwgStdNum = chartRows.find(r => r.cwgStdNum !== null)?.cwgStdNum ?? null;
  const refCwgStdLabel = chartRows.find(r => r.cwgStandard !== null)?.cwgStandard ?? null;

  // X-axis domain — include standards AND PB values so all markers sit inside the chart
  const allNums = [
    ...chartRows.map(r => r.markNum),
    ...chartRows.filter(r => r.pbNum !== null).map(r => r.pbNum as number),
    ...(refAgStdNum !== null ? [refAgStdNum] : []),
    ...(refCwgStdNum !== null ? [refCwgStdNum] : []),
  ].filter(v => isFinite(v) && v > 0);

  let xDomain: [number, number] = [0, 1];
  if (allNums.length > 0) {
    const minV = Math.min(...allNums);
    const maxV = Math.max(...allNums);
    const range = maxV - minV || 1;
    const pad = range * 0.15;
    xDomain = [
      parseFloat(Math.max(0, minV - pad).toFixed(3)),
      parseFloat((maxV + pad).toFixed(3)),
    ];
  }

  const chartHeight = Math.max(220, chartRows.length * 40 + 48);

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Summary cards — reflect current filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Reached AG - Q
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{qualifiedAGSet.size}</p>
            <p className="text-xs text-muted-foreground mt-1">athletes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" /> Reached CWG - Q
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{qualifiedCWGSet.size}</p>
            <p className="text-xs text-muted-foreground mt-1">athletes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Close to AG-Q
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{closeAGCount}</p>
            <p className="text-xs text-muted-foreground mt-1">athlete-events · &lt;2%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-400" /> Close to CWG-Q
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-400">{closeCWGCount}</p>
            <p className="text-xs text-muted-foreground mt-1">athlete-events · &lt;2%</p>
          </CardContent>
        </Card>
      </div>

      {/* Gap to Standard chart — filters live in the header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle>
                Gap to Standard{filterEvent !== "all" ? ` — ${filterEvent}` : ""}
              </CardTitle>
              <CardDescription className="mt-1">
                Coloured bar = 2026 season best · <span className="text-violet-600 font-medium">◆ violet marker</span> = all-time PB · dashed lines = AG (green) / CWG (indigo)
              </CardDescription>
            </div>

            {/* Filters tucked into the top-right of the chart card */}
            <div className="flex flex-wrap gap-3 shrink-0">
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <div className="flex gap-1">
                  {[{ value: "all", label: "All" }, { value: "M", label: "Men's" }, { value: "F", label: "Women's" }].map(g => (
                    <button
                      key={g.value}
                      onClick={() => setFilterGender(g.value)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        filterGender === g.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1 min-w-[180px]">
                <Label className="text-xs">Event</Label>
                <SearchableSelect
                  value={filterEvent}
                  onValueChange={setFilterEvent}
                  options={[{ value: "all", label: "All Events" }]}
                  groups={EVENT_GROUPS.map(g => ({
                    label: g.label,
                    options: g.events.map(e => ({ value: e, label: e })),
                  }))}
                  searchPlaceholder="Search events…"
                />
              </div>
            </div>
          </div>

          {/* Standards + PB legend — shown only when an event is selected */}
          {filterEvent !== "all" && (
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
              {refAgStdNum !== null && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-dashed border-emerald-500" />
                  <span className="text-emerald-600 font-medium">AG</span>
                  &nbsp;{refAgStdLabel}
                </span>
              )}
              {refCwgStdNum !== null && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-dashed border-indigo-500" />
                  <span className="text-indigo-600 font-medium">CWG</span>
                  &nbsp;{refCwgStdLabel}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <line x1="7" y1="1" x2="7" y2="13" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                  <polygon points="7,3 11,7 7,11 3,7" fill="#7c3aed" />
                </svg>
                <span className="text-violet-600 font-medium">All-time PB</span>
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : filterEvent === "all" ? (
            /* Default blank state — no event chosen yet */
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <BarChart2 className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Choose an event to display the chart</p>
            </div>
          ) : chartRows.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data for this event</div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={xDomain}
                  tickFormatter={(v) => formatAxisTick(v, filterEvent)}
                  tick={{ fontSize: 11 }}
                  tickCount={5}
                />
                <YAxis
                  type="category"
                  dataKey="athleteName"
                  width={160}
                  tick={({ x, y, payload }) => {
                    const name: string = payload.value;
                    const truncated = name.length > 22 ? name.slice(0, 20) + "…" : name;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={-4}
                          y={0}
                          dy={4}
                          textAnchor="end"
                          fill="#111827"
                          fontSize={12}
                        >
                          {truncated}
                        </text>
                      </g>
                    );
                  }}
                />
                <RechartsTooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as QualRow;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm space-y-1">
                        <p className="font-semibold">{d.athleteName}</p>
                        <p>
                          <span className="text-muted-foreground">2026 best:</span>{" "}
                          <strong className="font-mono">{d.bestMark}</strong>
                        </p>
                        {d.pbMark && (
                          <p>
                            <span className="text-violet-600 font-medium">All-time PB:</span>{" "}
                            <strong className="font-mono">{d.pbMark}</strong>
                          </p>
                        )}
                        {d.agStandard && (
                          <p>
                            AG std: <strong className="font-mono">{d.agStandard}</strong>
                            {d.agGap !== null && (
                              <span className={`ml-1.5 font-semibold ${d.agGap < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                ({d.agGap > 0 ? "+" : ""}{d.agGap}%)
                              </span>
                            )}
                          </p>
                        )}
                        {d.cwgStandard && (
                          <p>
                            CWG std: <strong className="font-mono">{d.cwgStandard}</strong>
                            {d.cwgGap !== null && (
                              <span className={`ml-1.5 font-semibold ${d.cwgGap < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                ({d.cwgGap > 0 ? "+" : ""}{d.cwgGap}%)
                              </span>
                            )}
                          </p>
                        )}
                        <StatusBadge status={d.status} />
                      </div>
                    );
                  }}
                />

                {/*
                  Single bar: 2026 season best (coloured rect) + PB diamond marker (violet tick)
                  Both rendered in the same row via a single custom shape using xDomain closure.
                */}
                <Bar
                  dataKey="markNum"
                  maxBarSize={24}
                  shape={(props: any) => {
                    const { x, y, width, height, background, payload } = props;
                    if (!width || !height || !isFinite(width) || !isFinite(height)) return <g />;

                    const status: Status = payload?.status ?? "in_progress";
                    const pbNum: number | null = payload?.pbNum ?? null;

                    const cy = y + height / 2;
                    const half = Math.max(2, height / 2 - 2);
                    const dw = 4;

                    // Compute PB pixel x using the full background width and xDomain closure
                    let pbX: number | null = null;
                    if (
                      pbNum !== null &&
                      isFinite(pbNum) &&
                      background &&
                      isFinite(background.width) &&
                      background.width > 0 &&
                      xDomain[1] > xDomain[0]
                    ) {
                      const fraction = (pbNum - xDomain[0]) / (xDomain[1] - xDomain[0]);
                      pbX = background.x + fraction * background.width;
                    }

                    return (
                      <g>
                        {/* Coloured season-best bar */}
                        <rect
                          x={x}
                          y={y + 2}
                          width={Math.max(0, width)}
                          height={Math.max(0, height - 4)}
                          fill={barColor(status)}
                          rx={3}
                          ry={3}
                        />
                        {/* Violet PB diamond marker on the same row */}
                        {pbX !== null && (
                          <g>
                            <line
                              x1={pbX} y1={cy - half}
                              x2={pbX} y2={cy + half}
                              stroke="#7c3aed"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                            />
                            <polygon
                              points={`${pbX},${cy - dw} ${pbX + dw},${cy} ${pbX},${cy + dw} ${pbX - dw},${cy}`}
                              fill="#7c3aed"
                            />
                          </g>
                        )}
                      </g>
                    );
                  }}
                >
                  <LabelList
                    dataKey="bestMark"
                    position="right"
                    style={{ fontSize: 11, fontFamily: "monospace", fill: "#374151", fontWeight: 600 }}
                  />
                </Bar>

                {/* AG qualifying standard */}
                {refAgStdNum !== null && isFinite(refAgStdNum) && (
                  <ReferenceLine
                    x={refAgStdNum}
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    label={{
                      value: `AG`,
                      position: "insideTopLeft",
                      fill: "#10b981",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {/* CWG qualifying standard */}
                {refCwgStdNum !== null && isFinite(refCwgStdNum) && (
                  <ReferenceLine
                    x={refCwgStdNum}
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    label={{
                      value: `CWG`,
                      position: "insideTopRight",
                      fill: "#6366f1",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Athletes × Events</CardTitle>
          <CardDescription>
            Complete qualification tracker · 2026 results only · green = reached Q standard · amber = close to AG-Q · orange = close to CWG-Q
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-right p-2">
                    <span className="inline-flex items-center gap-1 justify-end">
                      Best Mark
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[180px] text-center">
                          Best result from the 2026 competition season
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </th>
                  <th className="text-right p-2">All-time PB</th>
                  <th className="text-right p-2">AG Std</th>
                  <th className="text-right p-2">AG Gap</th>
                  <th className="text-right p-2">CWG Std</th>
                  <th className="text-right p-2">CWG Gap</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const qualified = r.status === "qualified_ag" || r.status === "qualified_cwg" || r.status === "both";
                  const rowBg = qualified
                    ? "bg-emerald-50 dark:bg-emerald-950/20"
                    : r.status === "close_ag"
                    ? "bg-amber-50 dark:bg-amber-950/20"
                    : r.status === "close_cwg"
                    ? "bg-orange-50 dark:bg-orange-950/20"
                    : "";
                  return (
                    <tr key={i} className={`border-b hover:bg-muted/40 ${rowBg}`}>
                      <td className="p-2 font-medium">{r.athleteName}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{r.event}</Badge>
                      </td>
                      <td className="p-2 text-right font-mono">{r.bestMark}</td>
                      <td className="p-2 text-right font-mono text-violet-600 font-semibold">
                        {r.pbMark ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">{r.agStandard ?? "—"}</td>
                      <td className={`p-2 text-right font-semibold ${r.agGap === null ? "text-muted-foreground" : r.agGap < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {r.agGap !== null ? `${r.agGap > 0 ? "+" : ""}${r.agGap}%` : "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">{r.cwgStandard ?? "—"}</td>
                      <td className={`p-2 text-right font-semibold ${r.cwgGap === null ? "text-muted-foreground" : r.cwgGap < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {r.cwgGap !== null ? `${r.cwgGap > 0 ? "+" : ""}${r.cwgGap}%` : "—"}
                      </td>
                      <td className="p-2"><StatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">No data for selected filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
