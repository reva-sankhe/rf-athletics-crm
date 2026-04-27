import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchWAToplists, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAToplist, WAAthleteProfile } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Medal, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { classifyEvent } from "@/lib/eventUtils";

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

function getEventGender(event: string): string {
  if (event.startsWith("Men's")) return "M";
  if (event.startsWith("Women's")) return "F";
  return "X";
}

export function GlobalStandingsTab() {
  const [toplists, setToplists] = useState<WAToplist[]>([]);
  const [rfAthletes, setRFAthletes] = useState<WAAthleteProfile[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("Men's 100m");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [sortMode, setSortMode] = useState<"score" | "mark">("score");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [selectedEvent]);

  async function loadData() {
    setLoading(true);
    try {
      const gender = getEventGender(selectedEvent);
      const [toplistData, rfData] = await Promise.all([
        fetchWAToplists(selectedEvent, gender, 50),
        fetchWAAthleteProfiles(),
      ]);
      setToplists(toplistData);
      setRFAthletes(rfData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const rfNamesLower = new Set(rfAthletes.map(a => a.reliance_name.toLowerCase()));
  const isRF = (name: string) => rfNamesLower.has(name.toLowerCase());

  const eventDirection = classifyEvent(selectedEvent).direction;

  function parseMarkNum(markStr: string): number {
    const cleaned = markStr.replace(/\s*\([^)]*\)/g, "").trim();
    if (eventDirection === "lower_better") {
      const t = cleaned.replace(/[^0-9:.]/g, "");
      if (!t) return Infinity;
      const parts = t.split(/[:.]/).map(Number);
      if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 100;
      if (parts.length === 2) return parts[0] + parts[1] / 100;
      return parseFloat(t) || Infinity;
    }
    return parseFloat(cleaned.replace(/[^0-9.]/g, "")) || -Infinity;
  }

  const regionFiltered = toplists.filter(t => {
    if (selectedRegion === "asia") return t.region === "Asia";
    if (selectedRegion === "india") return t.nationality === "IND";
    return true;
  });

  const filtered = [...regionFiltered].sort((a, b) => {
    if (sortMode === "mark") {
      const aVal = parseMarkNum(a.mark);
      const bVal = parseMarkNum(b.mark);
      return eventDirection === "lower_better" ? aVal - bVal : bVal - aVal;
    }
    // Default: sort by WA score descending
    return (parseInt(b.score) || 0) - (parseInt(a.score) || 0);
  });

  // Chart always uses score order (top 25 by score)
  const top25 = [...regionFiltered]
    .sort((a, b) => (parseInt(b.score) || 0) - (parseInt(a.score) || 0))
    .slice(0, 25);

  const chartData = top25.map((item, i) => ({
    position: i + 1,
    name: item.athlete_name,
    score: parseInt(item.score) || 0,
    mark: item.mark,
    nationality: item.nationality,
    isRF: isRF(item.athlete_name),
    region: item.region,
  }));

  const rfPositions = chartData.filter(d => d.isRF);
  const bestRF = rfPositions.length > 0
    ? rfPositions.reduce((b, d) => d.position < b.position ? d : b)
    : null;
  const leader = chartData[0];
  const rfScoreGap = bestRF && leader ? leader.score - bestRF.score : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">Event</Label>
              <SearchableSelect
                value={selectedEvent}
                onValueChange={setSelectedEvent}
                options={EVENTS.map(e => ({ value: e, label: e }))}
                searchPlaceholder="Search events…"
              />
            </div>
            <div className="space-y-1.5 min-w-[150px]">
              <Label className="text-xs">Region</Label>
              <SearchableSelect
                value={selectedRegion}
                onValueChange={setSelectedRegion}
                options={[
                  { value: "all", label: "All Regions" },
                  { value: "asia", label: "Asia" },
                  { value: "india", label: "India Only" },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Medal className="h-4 w-4" /> Best RF Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestRF ? (
              <>
                <p className="text-3xl font-bold text-blue-600">#{bestRF.position}</p>
                <p className="text-sm text-muted-foreground mt-1 truncate">{bestRF.name}</p>
                <p className="text-xs text-muted-foreground">Mark: {bestRF.mark}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No RF athletes in top 25</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">RF Athletes in View</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{rfPositions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">out of {top25.length} athletes shown</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score Gap to Leader</CardTitle>
          </CardHeader>
          <CardContent>
            {rfScoreGap !== null ? (
              <>
                <p className="text-3xl font-bold text-amber-500">{rfScoreGap}</p>
                <p className="text-xs text-muted-foreground mt-1">points behind #1</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Standings — {selectedEvent}</CardTitle>
          <CardDescription>Top 25 by WA score · RF athletes shown as larger blue dots</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">No data for selected filters</div>
          ) : (
            <>
              <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Other athletes</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> RF athletes</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="position"
                    label={{ value: "Position", position: "insideBottom", offset: -4 }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    label={{ value: "WA Score", angle: -90, position: "insideLeft" }}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-muted-foreground text-xs">{d.nationality} · {d.region}</p>
                          <p>Mark: <strong className="font-mono">{d.mark}</strong></p>
                          <p>Score: <strong>{d.score}</strong></p>
                          {d.isRF && <Badge className="mt-1 text-xs">RF Athlete</Badge>}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-${payload.position}`}
                          cx={cx} cy={cy}
                          r={payload.isRF ? 7 : 4}
                          fill={payload.isRF ? "#3b82f6" : "#94a3b8"}
                          stroke="white" strokeWidth={1.5}
                        />
                      );
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
          <CardTitle>Full Rankings</CardTitle>
          <CardDescription>RF athletes highlighted · click Mark or Score header to sort</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left p-2">Pos</th>
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-left p-2">Country</th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => setSortMode("mark")}
                      className={`flex items-center gap-1 ml-auto transition-colors hover:text-foreground ${sortMode === "mark" ? "text-foreground font-semibold" : ""}`}
                    >
                      Mark
                      {sortMode === "mark"
                        ? (eventDirection === "lower_better"
                          ? <ArrowUp size={11} />
                          : <ArrowDown size={11} />)
                        : <ArrowUpDown size={11} className="opacity-40" />}
                    </button>
                  </th>
                  <th className="text-right p-2">
                    <button
                      onClick={() => setSortMode("score")}
                      className={`flex items-center gap-1 ml-auto transition-colors hover:text-foreground ${sortMode === "score" ? "text-foreground font-semibold" : ""}`}
                    >
                      Score
                      {sortMode === "score"
                        ? <ArrowDown size={11} />
                        : <ArrowUpDown size={11} className="opacity-40" />}
                    </button>
                  </th>
                  <th className="text-left p-2">Region</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((item, i) => {
                  const rfFlag = isRF(item.athlete_name);
                  return (
                    <tr
                      key={item.id}
                      className={`border-b ${rfFlag ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-muted/40"}`}
                    >
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">
                        {item.athlete_name}
                        {rfFlag && <Badge variant="secondary" className="ml-2 text-xs">RF</Badge>}
                      </td>
                      <td className="p-2 text-muted-foreground">{item.nationality}</td>
                      <td className={`p-2 text-right font-mono ${sortMode === "mark" ? "font-semibold" : ""}`}>{item.mark}</td>
                      <td className={`p-2 text-right ${sortMode === "score" ? "font-semibold" : ""}`}>{item.score}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{item.region}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No data for selected filters</td>
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
