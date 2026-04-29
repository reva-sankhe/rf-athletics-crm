import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { fetchWAToplists, fetchWAAthleteProfiles, fetchEventBenchmark } from "@/lib/queries";
import type { WAToplist, WAAthleteProfile, EventBenchmark } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { Medal } from "lucide-react";
import { classifyEvent } from "@/lib/eventUtils";
import type { PerformanceDirection } from "@/lib/eventUtils";

const EVENTS = [
  "Men's 100m", "Men's 110m Hurdles", "Men's 200m", "Men's 400m", "Men's 400m Hurdles",
  "Men's Decathlon", "Men's Discus Throw", "Men's Half-Marathon", "Men's Hammer Throw",
  "Men's High Jump", "Men's Javelin Throw", "Men's Long Jump", "Men's Marathon",
  "Men's Pole Vault", "Men's Shot Put", "Men's Triple Jump",
  "Men's 4 x 100m Relay", "Men's 4 x 400m Relay",
  "Women's 100m", "Women's 100m Hurdles", "Women's 200m", "Women's 400m", "Women's 400m Hurdles",
  "Women's Discus Throw", "Women's Half-Marathon", "Women's Hammer Throw", "Women's Heptathlon",
  "Women's High Jump", "Women's Javelin Throw", "Women's Long Jump", "Women's Marathon",
  "Women's Pole Vault", "Women's Shot Put", "Women's Triple Jump",
  "Women's 4 x 100m Relay", "Women's 4 x 400m Relay",
  "4 x 100m Mixed Relay", "4 x 400m Mixed Relay",
];

const TOP3_COLOR = "#f59e0b"; // amber/yellow for top 3
const RF_COLOR = "#00A651";   // RF green

function getEventGender(event: string): string {
  if (event.startsWith("Men's")) return "M";
  if (event.startsWith("Women's")) return "F";
  return "X";
}

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
  const [toplists, setToplists] = useState<WAToplist[]>([]);
  const [rfAthletes, setRFAthletes] = useState<WAAthleteProfile[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("Men's 100m");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [sortMode, setSortMode] = useState<"score" | "mark">("score");
  const [loading, setLoading] = useState(true);
  const [benchmark, setBenchmark] = useState<EventBenchmark | null>(null);

  useEffect(() => { loadData(); }, [selectedEvent, selectedRegion]);

  async function loadData() {
    setLoading(true);
    try {
      const gender = getEventGender(selectedEvent);
      // Map UI region filter to the wa_toplists region column value so that
      // the rank field in each returned row is the true WA rank for that scope.
      // "all"   → fetch Global region (WA world rankings)
      // "asia"  → fetch Asia region   (WA Asian rankings)
      // "india" → fetch India region  (WA India-specific rankings)
      const fetchRegion =
        selectedRegion === "asia"  ? "Asia"   :
        selectedRegion === "india" ? "India"  :
        "Global";

      const [toplistData, rfData, benchmarkData] = await Promise.all([
        fetchWAToplists(selectedEvent, gender, 2000, fetchRegion),
        fetchWAAthleteProfiles(),
        fetchEventBenchmark(selectedEvent),
      ]);
      setToplists(toplistData);
      setRFAthletes(rfData);
      setBenchmark(benchmarkData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

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

  // Summary stats — use the full mark-sorted list so RF athletes ranked outside top-25 are not missed
  const rfInAll = sortedByMark.filter(d => isRF(d.athlete_name));
  const bestRF = rfInAll.length > 0 ? rfInAll[0] : null;
  // Use the WA rank from the database (same value shown in the bar chart) for consistency
  const bestRFRank = bestRF?.rank ?? null;
  const leader = sortedByMark[0];
  const rfScoreGap = bestRF && leader
    ? (parseInt(leader.score) || 0) - (parseInt(bestRF.score) || 0)
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

      {/* Summary cards — compact single-row strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-0">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <Medal className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Best RF Position</p>
              {bestRF ? (
                <p className="text-lg font-bold text-blue-600 leading-none">
                  #{bestRFRank}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5 truncate">{bestRF.athlete_name} · {bestRF.mark}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No RF athletes ranked</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">RF Athletes Ranked</p>
              <p className="text-lg font-bold leading-none">
                {rfInAll.length}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">of {sortedByMark.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Score Gap to Leader</p>
              {rfScoreGap !== null ? (
                <p className="text-lg font-bold text-amber-500 leading-none">
                  {rfScoreGap}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">pts behind #1</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Horizontal Bar Chart ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title + filters */}
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="shrink-0">Performance Standings</CardTitle>
              <SearchableSelect
                value={selectedEvent}
                onValueChange={setSelectedEvent}
                options={EVENTS.map(e => ({ value: e, label: e }))}
                searchPlaceholder="Search events…"
                className="w-[200px]"
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
                  margin={{ top: 2, right: 90, left: 8, bottom: 4 }}
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
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={({ active, payload }) => {
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
                    }}
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
                      label={{
                        value: `AG (${benchmark?.asian_games_qual_standard})`,
                        position: "insideTopLeft",
                        fill: "#10b981",
                        fontSize: 10,
                        fontWeight: 600,
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
                      label={{
                        value: `CWG (${benchmark?.commonwealth_games_qual_standard})`,
                        position: "insideTopRight",
                        fill: "#6366f1",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>

            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
