import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchWAToplists, fetchWAAthleteProfiles, fetchEventBenchmark } from "@/lib/queries";
import type { WAToplist, WAAthleteProfile, EventBenchmark } from "@/lib/types";
import { TOPLIST_DISCIPLINE_GROUPS } from "@/lib/eventGroups";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
  type TooltipProps,
} from "recharts";
import { Medal, Info } from "lucide-react";
import { classifyEvent } from "@/lib/eventUtils";
import type { PerformanceDirection } from "@/lib/eventUtils";


const TOP3_COLOR = "#f59e0b"; // amber/yellow for top 3
const RF_COLOR = "#00A651";   // RF green


/** Parse a mark string to a numeric value for chart comparisons */
function parseMarkForChart(markStr: string, direction: PerformanceDirection): number {
  const cleaned = markStr.replace(/\s*\([^)]*\)/g, "").trim();
  if (direction === "lower_better") {
    const t = cleaned.replace(/[^0-9:.]/g, "");
    if (!t) return Infinity;
    const parts = t.split(/[:.]/).map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 100;
    if (parts.length === 2) return parts[0] + parts[1] / 100;
    return parseFloat(t) || Infinity;
  }
  return parseFloat(cleaned.replace(/[^0-9.]/g, "")) || 0;
}

/** Format a numeric seconds/meters value back to a human-readable mark */
function formatAxisTick(value: number, direction: PerformanceDirection): string {
  if (direction === "lower_better") {
    if (value >= 60) {
      const mins = Math.floor(value / 60);
      const secs = value % 60;
      return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
    }
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

type BarSection = "top" | "rf";

interface BarEntry {
  name: string;
  markNum: number;
  mark: string;
  nationality: string;
  score: string;
  isRF: boolean;
  section: BarSection;
  rank: number;         // global rank in the filtered list
  medalIndex?: number;  // 0/1/2 for top 3
}

export function GlobalStandingsTab() {
  const [selectedGender, setSelectedGender] = useState("M");
  const [selectedDiscipline, setSelectedDiscipline] = useState("100m");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [sortMode, setSortMode] = useState<"score" | "mark">("score");

  const selectedEvent = `${selectedGender === "M" ? "Men's" : "Women's"} ${selectedDiscipline}`;

  const fetchRegion =
    selectedRegion === "asia"  ? "Asia"  :
    selectedRegion === "india" ? "India" :
    "Global";

  function handleGenderChange(g: string) {
    setSelectedGender(g);
    const allEvents = (TOPLIST_DISCIPLINE_GROUPS[g] ?? TOPLIST_DISCIPLINE_GROUPS.M).flatMap(gr => gr.events);
    if (!allEvents.includes(selectedDiscipline)) setSelectedDiscipline(allEvents[0]);
  }

  const { data: toplists = [], isFetching: toplistFetching } = useQuery<WAToplist[]>({
    queryKey: ["toplists", selectedEvent, selectedGender, fetchRegion, 2000],
    queryFn: () => fetchWAToplists(selectedEvent, selectedGender, 2000, fetchRegion),
  });
  const { data: rfAthletes = [] } = useQuery<WAAthleteProfile[]>({
    queryKey: ["athletes"],
    queryFn: () => fetchWAAthleteProfiles(),
  });
  const { data: benchmark = null } = useQuery<EventBenchmark | null>({
    queryKey: ["benchmark", selectedEvent],
    queryFn: () => fetchEventBenchmark(selectedEvent),
  });
  const loading = toplistFetching;

  const rfNamesLower = new Set(rfAthletes.map(a => a.reliance_name.toLowerCase()));
  const isRF = (name: string) => rfNamesLower.has(name.toLowerCase());

  const eventDirection = classifyEvent(selectedEvent).direction;

  // Data is already scoped to the correct region by the DB query in loadData.
  // Deduplicate: keep only the best performance per athlete (across years).
  const deduplicatedMap = new Map<string, WAToplist>();
  for (const entry of toplists) {
    const key = entry.athlete_name.toLowerCase();
    const existing = deduplicatedMap.get(key);
    if (!existing) {
      deduplicatedMap.set(key, entry);
    } else {
      const existingVal = parseMarkForChart(existing.mark, eventDirection);
      const newVal = parseMarkForChart(entry.mark, eventDirection);
      const isBetter = eventDirection === "lower_better" ? newVal < existingVal : newVal > existingVal;
      if (isBetter) deduplicatedMap.set(key, entry);
    }
  }
  const deduplicated = Array.from(deduplicatedMap.values());

  // Sorted by mark (best performance first) for top-3 chart
  const sortedByMark = [...deduplicated].sort((a, b) => {
    const aVal = parseMarkForChart(a.mark, eventDirection);
    const bVal = parseMarkForChart(b.mark, eventDirection);
    return eventDirection === "lower_better" ? aVal - bVal : bVal - aVal;
  });

  // Ranks to show in the chart (1-based)
  const TOP_RANKS = [1, 2, 3, 5, 10];
  const topEntries = TOP_RANKS
    .map(r => sortedByMark[r - 1])
    .filter(Boolean);
  const topNames = new Set(topEntries.map(a => a.athlete_name));

  // RF athletes not already in topEntries, sorted by best mark
  const rfNotInTop = deduplicated
    .filter((a: WAToplist) => isRF(a.athlete_name) && !topNames.has(a.athlete_name))
    .sort((a: WAToplist, b: WAToplist) => {
      const aVal = parseMarkForChart(a.mark, eventDirection);
      const bVal = parseMarkForChart(b.mark, eventDirection);
      return eventDirection === "lower_better" ? aVal - bVal : bVal - aVal;
    });

  // Build combined bar chart data
  const barChartData: BarEntry[] = [
    ...topEntries.map((item, i) => ({
      name: item.athlete_name,
      markNum: parseMarkForChart(item.mark, eventDirection),
      mark: item.mark,
      nationality: item.nationality,
      score: item.score,
      isRF: isRF(item.athlete_name),
      section: "top" as BarSection,
      rank: TOP_RANKS[i],
    })),
    ...rfNotInTop.map((item) => ({
      name: item.athlete_name,
      markNum: parseMarkForChart(item.mark, eventDirection),
      mark: item.mark,
      nationality: item.nationality,
      score: item.score,
      isRF: true,
      section: "rf" as BarSection,
      // Use the actual WA rank stored in the database for the fetched region
      // (Global rank when "All Regions" is selected, Asia rank for "Asia", etc.)
      // This replaces the previous bug where a locally-computed sort position was
      // used, which could accidentally show a rank number that matched a different
      // event's ranking (e.g., showing #37 for 100m when the athlete is #37 in 200m).
      rank: item.rank,
    })),
  ];

  // Parse qualifying standards to numeric
  const agStdNum = benchmark?.asian_games_qual_standard
    ? parseMarkForChart(benchmark.asian_games_qual_standard, eventDirection)
    : null;
  const cwgStdNum = benchmark?.commonwealth_games_qual_standard
    ? parseMarkForChart(benchmark.commonwealth_games_qual_standard, eventDirection)
    : null;

  // Compute X-axis domain including the qualifying standards
  const validNums = barChartData
    .map(d => d.markNum)
    .filter(v => isFinite(v) && v > 0);
  const allDomainNums = [
    ...validNums,
    ...(agStdNum !== null && isFinite(agStdNum) && agStdNum > 0 ? [agStdNum] : []),
    ...(cwgStdNum !== null && isFinite(cwgStdNum) && cwgStdNum > 0 ? [cwgStdNum] : []),
  ];

  let xDomain: [number, number] = [0, 1];
  if (allDomainNums.length > 0) {
    const minV = Math.min(...allDomainNums);
    const maxV = Math.max(...allDomainNums);
    const range = maxV - minV || 1;
    const pad = range * 0.2;
    xDomain = [
      Math.max(0, parseFloat((minV - pad).toFixed(2))),
      parseFloat((maxV + pad).toFixed(2)),
    ];
  }

  const chartHeight = Math.max(200, barChartData.length * 46 + 60);

  // Detect when AG and CWG labels would visually overlap (within ~15% of domain width)
  const domainWidth = xDomain[1] - xDomain[0] || 1;
  const labelsOverlap =
    agStdNum !== null && isFinite(agStdNum) &&
    cwgStdNum !== null && isFinite(cwgStdNum) &&
    Math.abs(agStdNum - cwgStdNum) / domainWidth < 0.15;

  // When labels overlap we need a taller top margin to fit two stacked rows
  const chartTopMargin = labelsOverlap ? 32 : 22;

  const renderBarTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as BarEntry;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold">{d.name}</p>
        <p className="text-muted-foreground text-xs">
          {d.nationality}{d.section === "rf" ? ` · Global rank #${d.rank}` : ""}
        </p>
        <p>Mark: <strong className="font-mono">{d.mark}</strong></p>
        {d.score && <p>WA Score: <strong>{d.score}</strong></p>}
        {d.isRF && (
          <Badge className="mt-1 text-xs" style={{ background: RF_COLOR, color: "white" }}>
            RF Athlete
          </Badge>
        )}
      </div>
    );
  };

  // Summary stats — use the full mark-sorted list so RF athletes ranked outside top-25 are not missed
  const rfInAll = sortedByMark.filter(d => isRF(d.athlete_name));
  const bestRF = rfInAll.length > 0 ? rfInAll[0] : null;
  // Use the WA rank from the database (same value shown in the bar chart) for consistency
  const bestRFRank = bestRF?.rank ?? null;
  const leader = sortedByMark[0];
  const leaderScore = parseInt(leader?.score) || 0;
  const rfScore = bestRF ? (parseInt(bestRF.score) || 0) : 0;
  const rfScoreGap = bestRF && leader && leaderScore > 0
    ? (((leaderScore - rfScore) / leaderScore) * 100).toFixed(1)
    : null;

  // Full rankings table (sorted by selected mode)
  const filtered = [...deduplicated].sort((a, b) => {
    if (sortMode === "mark") {
      const aVal = parseMarkForChart(a.mark, eventDirection);
      const bVal = parseMarkForChart(b.mark, eventDirection);
      return eventDirection === "lower_better" ? aVal - bVal : bVal - aVal;
    }
    return (parseInt(b.score) || 0) - (parseInt(a.score) || 0);
  });

  return (
    <div className="space-y-3">

      {/* Summary cards */}
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-3 gap-3">

          {/* Best RF Position */}
          <Card className="py-0">
            <CardContent className="px-5 py-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-blue-500 shrink-0" />
                  <p className="text-sm font-medium text-muted-foreground">Best RF Position</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center leading-snug">
                    The highest World Athletics ranking held by any RF athlete in the selected event and region scope.
                  </TooltipContent>
                </Tooltip>
              </div>
              {bestRF ? (
                <>
                  <p className="text-3xl font-bold text-blue-600 leading-none mb-1">#{bestRFRank}</p>
                  <p className="text-sm text-muted-foreground truncate">{bestRF.athlete_name} · <span className="font-mono font-semibold">{bestRF.mark}</span></p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No RF athletes ranked</p>
              )}
            </CardContent>
          </Card>

          {/* RF Athletes Ranked */}
          <Card className="py-0">
            <CardContent className="px-5 py-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm font-medium text-muted-foreground">RF Athletes Ranked</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center leading-snug">
                    How many RF athletes appear in the World Athletics toplist for this event and region, out of all athletes ranked.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-3xl font-bold leading-none mb-1">{rfInAll.length}</p>
              <p className="text-sm text-muted-foreground">of {sortedByMark.length} athletes ranked</p>
            </CardContent>
          </Card>

          {/* Score Gap to Leader */}
          <Card className="py-0">
            <CardContent className="px-5 py-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm font-medium text-muted-foreground">Score Gap to Leader</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-center leading-snug">
                    Difference in World Athletics scoring points between the #1 ranked athlete and the best-ranked RF athlete. A smaller gap means RF is closer to the world leader.
                  </TooltipContent>
                </Tooltip>
              </div>
              {rfScoreGap !== null ? (
                <p className="text-lg font-bold text-amber-500 leading-none">
                  {rfScoreGap}%
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">behind #1</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

        </div>
      </TooltipProvider>

      {/* ── Horizontal Bar Chart ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title + filters */}
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="shrink-0">Performance Standings</CardTitle>
              <div className="flex gap-1">
                {[{ value: "M", label: "Men's" }, { value: "F", label: "Women's" }].map(g => (
                  <button
                    key={g.value}
                    onClick={() => handleGenderChange(g.value)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      selectedGender === g.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <SearchableSelect
                value={selectedDiscipline}
                onValueChange={setSelectedDiscipline}
                groups={(TOPLIST_DISCIPLINE_GROUPS[selectedGender] ?? TOPLIST_DISCIPLINE_GROUPS.M).map(g => ({
                  label: g.label,
                  options: g.events.map(e => ({ value: e, label: e })),
                }))}
                searchPlaceholder="Search events…"
                className="w-[180px]"
              />
              <SearchableSelect
                value={selectedRegion}
                onValueChange={setSelectedRegion}
                options={[
                  { value: "all", label: "All Regions" },
                  { value: "asia", label: "Asia" },
                  { value: "india", label: "India Only" },
                ]}
                className="w-[140px]"
              />
            </div>
            {/* Qualifying standards legend */}
            {(agStdNum !== null || cwgStdNum !== null) && (
              <div className="flex flex-col gap-1 text-xs text-muted-foreground text-right shrink-0">
                {agStdNum !== null && isFinite(agStdNum) && (
                  <span className="flex items-center justify-end gap-1.5">
                    <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "#10b981" }} />
                    <span style={{ color: "#10b981" }} className="font-medium">AG</span>
                    &nbsp;{benchmark?.asian_games_qual_standard}
                  </span>
                )}
                {cwgStdNum !== null && isFinite(cwgStdNum) && (
                  <span className="flex items-center justify-end gap-1.5">
                    <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "#6366f1" }} />
                    <span style={{ color: "#6366f1" }} className="font-medium">CWG</span>
                    &nbsp;{benchmark?.commonwealth_games_qual_standard}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : barChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground">
              No data for selected filters
            </div>
          ) : (
            <>

              <ResponsiveContainer width="100%" height={barChartData.length * 36 + 32}>
                <BarChart
                  data={barChartData}
                  layout="vertical"
                  margin={{ top: chartTopMargin, right: 90, left: 8, bottom: 4 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={xDomain}
                    tickFormatter={(v) => formatAxisTick(v, eventDirection)}
                    tick={{ fontSize: 11 }}
                    tickCount={5}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tick={({ x, y, payload, index }) => {
                      const entry = barChartData[index];
                      const rawName: string = payload.value;
                      const truncated = rawName.length > 20 ? rawName.slice(0, 18) + "…" : rawName;
                      const rankPrefix = entry?.section === "top" ? `#${entry.rank} ` : "";
                      const rankSuffix = entry?.section === "rf" && entry?.rank ? ` (#${entry.rank})` : "";
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={-4}
                            y={0}
                            dy={4}
                            textAnchor="end"
                            fill={entry?.isRF ? RF_COLOR : "#111827"}
                            fontSize={12}
                            fontWeight={entry?.isRF ? 600 : 400}
                          >
                            {rankPrefix}{truncated}{rankSuffix}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={renderBarTooltip}
                  />
                  <Bar dataKey="markNum" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {barChartData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.isRF ? RF_COLOR : TOP3_COLOR}
                      />
                    ))}
                    <LabelList
                      dataKey="mark"
                      position="right"
                      style={{ fontSize: 12, fontFamily: "monospace", fill: "#374151", fontWeight: 600 }}
                    />
                  </Bar>

                  {/* Asian Games qualifying standard */}
                  {agStdNum !== null && isFinite(agStdNum) && (
                    <ReferenceLine
                      x={agStdNum}
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={(props: any) => {
                        const vb = props.viewBox ?? {};
                        // When labels overlap, AG sits in the lower row (closer to bars)
                        const labelY = (vb.y ?? chartTopMargin) - 6;
                        return (
                          <text x={(vb.x ?? 0) + 4} y={labelY} fontSize={10} fill="#10b981" fontWeight={600}>
                            AG ({benchmark?.asian_games_qual_standard})
                          </text>
                        );
                      }}
                    />
                  )}

                  {/* Commonwealth Games qualifying standard */}
                  {cwgStdNum !== null && isFinite(cwgStdNum) && (
                    <ReferenceLine
                      x={cwgStdNum}
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={(props: any) => {
                        const vb = props.viewBox ?? {};
                        const plotTop = vb.y ?? chartTopMargin;
                        // When labels overlap, CWG sits in the upper row (12px higher)
                        const labelY = plotTop - (labelsOverlap ? 18 : 6);
                        const lineX = vb.x ?? 0;
                        return (
                          <g>
                            <text x={lineX + 4} y={labelY} fontSize={10} fill="#6366f1" fontWeight={600}>
                              CWG ({benchmark?.commonwealth_games_qual_standard})
                            </text>
                            {/* Extend the dotted line up to the label when staggered */}
                            {labelsOverlap && (
                              <line
                                x1={lineX}
                                y1={labelY + 2}
                                x2={lineX}
                                y2={plotTop}
                                stroke="#6366f1"
                                strokeWidth={2}
                                strokeDasharray="5 3"
                              />
                            )}
                          </g>
                        );
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>

            </>
          )}
        </CardContent>
      </Card>

      {/* ── Data & Methodology Note ── */}
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground/70 text-xs uppercase tracking-wide">About this chart</p>
        <ul className="space-y-1 list-none">
          <li>
            <span className="font-medium text-foreground/80">Data source:</span>{" "}
            World Athletics annual toplists for <strong>2024 and 2025</strong>. Where an athlete appears in both seasons, only their <strong>best performance</strong> is used.
          </li>
          <li>
            <span className="font-medium text-foreground/80">Chart rows:</span>{" "}
            Shows the <strong>world-ranked #1, #2, #3, #5, and #10</strong> athletes as context benchmarks (amber), plus <strong>all RF athletes</strong> found in the toplist for the selected event (green). RF athletes already inside the top-10 appear only once in the top section.
          </li>
          <li>
            <span className="font-medium text-foreground/80">Rankings scope:</span>{" "}
            World Athletics maintains three separate ranked lists per event — <strong>Global</strong> (all nations), <strong>Asia</strong> (Asia-region only), and <strong>India</strong> (Indian athletes only). The region filter switches between these three scopes, and all rank numbers reflect the selected scope.
          </li>
        </ul>
      </div>

    </div>
  );
}
