import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchWAQualificationStandards, fetchWARFAthleteResults, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAQualificationStandard, WARFAthleteResult, WAAthleteProfile } from "@/lib/types";
import { normalizeEventName, classifyEvent } from "@/lib/eventUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

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

function parseMarkValue(mark: string, event: string): number | null {
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

function calcGap(athleteMark: number, standardMark: number, event: string): number {
  const direction = classifyEvent(event).direction;
  if (direction === "lower_better") {
    // Negative = athlete is faster than standard = qualified
    return (athleteMark - standardMark) / standardMark * 100;
  } else {
    // Negative = athlete has exceeded the standard = qualified
    return (standardMark - athleteMark) / standardMark * 100;
  }
}

type Status = "both" | "qualified_ag" | "qualified_cwg" | "close" | "in_progress";

interface QualRow {
  athleteId: string;
  athleteName: string;
  gender: string;
  event: string;
  bestMark: string;
  bestScore: number;
  agStandard: string | null;
  agGap: number | null;
  cwgStandard: string | null;
  cwgGap: number | null;
  status: Status;
}

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "both": return <Badge className="bg-emerald-600 text-white text-xs">AG + CWG</Badge>;
    case "qualified_ag": return <Badge className="bg-emerald-600 text-white text-xs">Qual AG</Badge>;
    case "qualified_cwg": return <Badge className="bg-blue-600 text-white text-xs">Qual CWG</Badge>;
    case "close": return <Badge className="bg-amber-500 text-white text-xs">Close</Badge>;
    case "in_progress": return <Badge variant="outline" className="text-xs">In Progress</Badge>;
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

      const athleteVal = parseMarkValue(best.mark, event);

      const agGap = agStd && athleteVal !== null
        ? parseFloat(calcGap(athleteVal, parseFloat(agStd.standard), event).toFixed(2))
        : null;
      const cwgGap = cwgStd && athleteVal !== null
        ? parseFloat(calcGap(athleteVal, parseFloat(cwgStd.standard), event).toFixed(2))
        : null;

      const qualAG = agGap !== null && agGap < 0;
      const qualCWG = cwgGap !== null && cwgGap < 0;
      const gaps = [agGap, cwgGap].filter((g): g is number => g !== null);
      const minGap = gaps.length > 0 ? Math.min(...gaps) : null;

      const status: Status =
        qualAG && qualCWG ? "both" :
        qualAG ? "qualified_ag" :
        qualCWG ? "qualified_cwg" :
        minGap !== null && minGap < 2 ? "close" : "in_progress";

      return [{ athleteId: athlete.aa_athlete_id, athleteName: athlete.reliance_name, gender, event, bestMark: best.mark, bestScore: best.result_score, agStandard: agStd?.standard ?? null, agGap, cwgStandard: cwgStd?.standard ?? null, cwgGap, status }];
    });
  });

  const filtered = rows.filter(r => {
    if (filterEvent !== "all" && r.event !== filterEvent) return false;
    if (filterGender !== "all" && r.gender !== filterGender) return false;
    return true;
  });

  const qualifiedAGSet = new Set(rows.filter(r => r.status === "qualified_ag" || r.status === "both").map(r => r.athleteId));
  const qualifiedCWGSet = new Set(rows.filter(r => r.status === "qualified_cwg" || r.status === "both").map(r => r.athleteId));
  const closeCount = rows.filter(r => r.status === "close").length;
  const inProgressCount = rows.filter(r => r.status === "in_progress").length;

  // Chart: pick the selected event or default to 100m for the gap visual
  const chartEvent = filterEvent !== "all" ? filterEvent : "100m";
  const chartData = rows
    .filter(r => r.event === chartEvent && (filterGender === "all" || r.gender === filterGender))
    .sort((a, b) => (a.agGap ?? 99) - (b.agGap ?? 99))
    .map(r => ({ name: r.athleteName, agGap: r.agGap, cwgGap: r.cwgGap }));

  return (
    <div className="space-y-4">
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
              <AlertCircle className="h-4 w-4 text-amber-500" /> Close (&lt;2%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{closeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">athlete-events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" /> In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground mt-1">athlete-events</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs">Event</Label>
              <Select value={filterEvent} onValueChange={setFilterEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {EVENT_GROUPS.map(group => (
                    <div key={group.label}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</div>
                      {group.events.map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs">Gender</Label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="M">Men</SelectItem>
                  <SelectItem value="F">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gap to Standard — {filterEvent === "all" ? "100m" : filterEvent}</CardTitle>
          <CardDescription>
            % gap · below 0% = qualified · green = Asian Games, dashed blue = Commonwealth
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data for this event</div>
          ) : (
            <>
              <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Asian Games gap</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Commonwealth gap</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis label={{ value: "Gap %", angle: -90, position: "insideLeft" }} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.name}</p>
                          {d.agGap !== null && (
                            <p>AG: <strong className={d.agGap < 0 ? "text-emerald-600" : "text-amber-600"}>
                              {d.agGap > 0 ? "+" : ""}{d.agGap}%
                            </strong></p>
                          )}
                          {d.cwgGap !== null && (
                            <p>CWG: <strong className={d.cwgGap < 0 ? "text-emerald-600" : "text-amber-600"}>
                              {d.cwgGap > 0 ? "+" : ""}{d.cwgGap}%
                            </strong></p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="#10b981" strokeDasharray="4 2" label={{ value: "Standard", position: "insideTopRight", fill: "#10b981", fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="agGap"
                    stroke="#10b981"
                    strokeWidth={2}
                    connectNulls={false}
                    name="Asian Games %"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.agGap === null || payload.agGap === undefined) return <g key={`ag-${payload.name}`} />;
                      return <circle key={`ag-${payload.name}`} cx={cx} cy={cy} r={5} fill={payload.agGap < 0 ? "#10b981" : "#f59e0b"} stroke="white" strokeWidth={1.5} />;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cwgGap"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    connectNulls={false}
                    name="Commonwealth %"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.cwgGap === null || payload.cwgGap === undefined) return <g key={`cwg-${payload.name}`} />;
                      return <circle key={`cwg-${payload.name}`} cx={cx} cy={cy} r={5} fill={payload.cwgGap < 0 ? "#3b82f6" : "#f59e0b"} stroke="white" strokeWidth={1.5} />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Athletes × Events</CardTitle>
          <CardDescription>Complete qualification tracker · green rows = qualified · amber = within 2%</CardDescription>
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
                    : r.status === "close"
                    ? "bg-amber-50 dark:bg-amber-950/20"
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
