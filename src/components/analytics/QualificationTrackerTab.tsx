import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchWAQualificationStandards, fetchWARFAthleteResults, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAQualificationStandard, WARFAthleteResult, WAAthleteProfile } from "@/lib/types";
import { normalizeEventName, classifyEvent } from "@/lib/eventUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import { CheckCircle2, AlertCircle, BarChart2 } from "lucide-react";

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
  markNum: number;          // absolute numeric value for charting
  bestScore: number;
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
    case "both":         return <Badge className="bg-emerald-600 text-white text-xs">AG + CWG</Badge>;
    case "qualified_ag": return <Badge className="bg-emerald-600 text-white text-xs">Qual AG</Badge>;
    case "qualified_cwg":return <Badge className="bg-blue-600 text-white text-xs">Qual CWG</Badge>;
    case "close_ag":     return <Badge className="bg-amber-500 text-white text-xs">Close AG</Badge>;
    case "close_cwg":    return <Badge className="bg-orange-400 text-white text-xs">Close CWG</Badge>;
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
  const [standards, setStandards] = useState<WAQualificationStandard[]>([]);
  const [results, setResults] = useState<WARFAthleteResult[]>([]);
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterGender, setFilterGender] = useState("all");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [stds, res, ath] = await Promise.all([
        fetchWAQualificationStandards(),
        fetchWARFAthleteResults(undefined, 500),
        fetchWAAthleteProfiles(),
      ]);
      setStandards(stds);
      setResults(res);
      setAthletes(ath);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const rows: QualRow[] = athletes.flatMap(athlete => {
    const gender = athlete.gender || "M";
    return QUAL_EVENTS.flatMap(event => {
      const eventNorm = normDisc(event);
      const athResults = results.filter(
        r => r.aa_athlete_id === athlete.aa_athlete_id &&
          !r.not_legal &&
          normDisc(r.discipline) === eventNorm
      );
      if (athResults.length === 0) return [];

      const best = athResults.reduce((b, r) => r.result_score > b.result_score ? r : b);
      const agStd = standards.find(s => s.competition === "Asian Games" && s.event === event && s.gender === gender);
      const cwgStd = standards.find(s => s.competition === "Commonwealth Games" && s.event === event && s.gender === gender);

      const markNum = parseMarkNum(best.mark, event);
      if (markNum === null) return [];

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
        agStandard: agStd?.standard ?? null,
        agStdNum: agStdNum ?? null,
        agGap,
        cwgStandard: cwgStd?.standard ?? null,
        cwgStdNum: cwgStdNum ?? null,
        cwgGap,
        status,
      }];
    });
  });

  // Cards always reflect ALL events (no filter applied)
  const qualifiedAGSet = new Set(rows.filter(r => r.status === "qualified_ag" || r.status === "both").map(r => r.athleteId));
  const qualifiedCWGSet = new Set(rows.filter(r => r.status === "qualified_cwg" || r.status === "both").map(r => r.athleteId));
  // Close counts: independent — an athlete-event can be close to both
  const closeAGCount = rows.filter(r => r.agGap !== null && r.agGap >= 0 && r.agGap < 2).length;
  const closeCWGCount = rows.filter(r => r.cwgGap !== null && r.cwgGap >= 0 && r.cwgGap < 2).length;

  // Table respects both filters
  const filtered = rows.filter(r => {
    if (filterEvent !== "all" && r.event !== filterEvent) return false;
    if (filterGender !== "all" && r.gender !== filterGender) return false;
    return true;
  });

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

  // X-axis domain — include the standards so reference lines always sit inside the chart
  const allNums = [
    ...chartRows.map(r => r.markNum),
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
    <div className="space-y-4">
      {/* Summary cards — always show all-events totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Qualified AG
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
              <CheckCircle2 className="h-4 w-4 text-blue-600" /> Qualified CWG
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
              <AlertCircle className="h-4 w-4 text-amber-500" /> Close AG
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
              <AlertCircle className="h-4 w-4 text-orange-400" /> Close CWG
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
                Athlete best mark vs. qualifying standard · dashed lines = AG (green) / CWG (indigo)
              </CardDescription>
            </div>

            {/* Filters tucked into the top-right of the chart card */}
            <div className="flex flex-wrap gap-3 shrink-0">
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
              <div className="space-y-1 min-w-[120px]">
                <Label className="text-xs">Gender</Label>
                <SearchableSelect
                  value={filterGender}
                  onValueChange={setFilterGender}
                  options={[
                    { value: "all", label: "All" },
                    { value: "M", label: "Men" },
                    { value: "F", label: "Women" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Standards legend — shown only when an event is selected and standards exist */}
          {filterEvent !== "all" && (refAgStdNum !== null || refCwgStdNum !== null) && (
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
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
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as QualRow;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm space-y-1">
                        <p className="font-semibold">{d.athleteName}</p>
                        <p>Best mark: <strong className="font-mono">{d.bestMark}</strong></p>
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

                <Bar dataKey="markNum" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {chartRows.map((row, i) => (
                    <Cell key={`cell-${i}`} fill={barColor(row.status)} />
                  ))}
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
              <CardDescription>Complete qualification tracker · green = qualified · amber = close AG · orange = close CWG</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-right p-2">Best Mark</th>
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
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">No data for selected filters</td>
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
