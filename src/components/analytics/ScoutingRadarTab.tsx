import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { fetchWAToplists, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAToplist, WAAthleteProfile } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Radar, Search, Star } from "lucide-react";

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

export function ScoutingRadarTab() {
  const [toplists, setToplists] = useState<WAToplist[]>([]);
  const [rfAthletes, setRFAthletes] = useState<WAAthleteProfile[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("Men's 100m");
  const [minScore, setMinScore] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [selectedEvent]);

  async function loadData() {
    setLoading(true);
    try {
      const gender = getEventGender(selectedEvent);
      const [toplistData, rfData] = await Promise.all([
        fetchWAToplists(selectedEvent, gender, 200),
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

  // Best score per RF athlete in this event (for gap calculation)
  const rfScoresInEvent = toplists
    .filter(t => isRF(t.athlete_name))
    .map(t => parseInt(t.score) || 0);
  const rfBestScore = rfScoresInEvent.length > 0 ? Math.max(...rfScoresInEvent) : null;

  const scoreThreshold = minScore ? parseInt(minScore) : 0;

  // Indian athletes not in RF
  const scouts = toplists
    .filter(t => t.nationality === "IND" && !isRF(t.athlete_name))
    .filter(t => (parseInt(t.score) || 0) >= scoreThreshold)
    .map((t, i) => ({
      globalRank: toplists.indexOf(t) + 1,
      name: t.athlete_name,
      mark: t.mark,
      score: parseInt(t.score) || 0,
      region: t.region,
      venue: t.venue,
      date: t.date,
      gapToRFBest: rfBestScore !== null
        ? rfBestScore - (parseInt(t.score) || 0)
        : null,
    }))
    .sort((a, b) => b.score - a.score);

  // Chart: score curve for scouts
  const chartData = scouts.slice(0, 20).map((s, i) => ({
    rank: i + 1,
    name: s.name,
    score: s.score,
  }));

  // RF athletes in this event for reference line
  const rfInEvent = toplists
    .filter(t => isRF(t.athlete_name))
    .map(t => ({ name: t.athlete_name, score: parseInt(t.score) || 0 }))
    .sort((a, b) => b.score - a.score);

  const top5 = scouts.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" /> Scout Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{scouts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Indian athletes not in RF</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Top Scout Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scouts.length > 0 ? (
              <>
                <p className="text-3xl font-bold text-amber-500">{scouts[0].score}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{scouts[0].name}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No candidates</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Radar className="h-4 w-4 text-blue-500" /> RF Best Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rfBestScore !== null ? (
              <>
                <p className="text-3xl font-bold text-blue-600">{rfBestScore}</p>
                <p className="text-xs text-muted-foreground mt-1">{rfInEvent[0]?.name}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No RF data for this event</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">Event</Label>
              <SearchableSelect
                value={selectedEvent}
                onValueChange={setSelectedEvent}
                options={EVENTS.map(e => ({ value: e, label: e }))}
                searchPlaceholder="Search events…"
              />
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs">Min Score</Label>
              <Input
                type="number"
                placeholder="e.g. 900"
                value={minScore}
                onChange={e => setMinScore(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 prospects highlight */}
      {top5.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Scout Prospects</CardTitle>
            <CardDescription>Highest-scoring Indian athletes not currently in RF</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {top5.map((s, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    <Badge variant="outline" className="text-xs">{s.region}</Badge>
                  </div>
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{s.mark}</p>
                  <p className="text-lg font-bold">{s.score}</p>
                  {s.gapToRFBest !== null && (
                    <p className={`text-xs ${s.gapToRFBest <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {s.gapToRFBest <= 0 ? "Beats RF best" : `${s.gapToRFBest} pts below RF best`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score curve */}
      <Card>
        <CardHeader>
          <CardTitle>Scout Performance Curve — {selectedEvent}</CardTitle>
          <CardDescription>Non-RF Indian athletes ranked by score</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No non-RF Indian athletes found</div>
          ) : (
            <>
              <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Scout candidates</span>
                {rfBestScore && <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-blue-500 border-dashed inline-block" /> RF best ({rfBestScore})</span>}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rank" label={{ value: "Rank", position: "insideBottom", offset: -4 }} tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: "WA Score", angle: -90, position: "insideLeft" }} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.name}</p>
                          <p>Score: <strong>{d.score}</strong></p>
                          <p className="text-muted-foreground">Rank #{d.rank}</p>
                        </div>
                      );
                    }}
                  />
                  {rfBestScore && (
                    <Line
                      type="monotone"
                      dataKey={() => rfBestScore}
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      name="RF Best"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-${payload.rank}`}
                          cx={cx} cy={cy} r={4}
                          fill="#f59e0b"
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

      {/* Full scouting table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Scouting List</CardTitle>
          <CardDescription>Indian athletes not in RF · sorted by score</CardDescription>
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
                  <th className="text-right p-2">Gap to RF Best</th>
                  <th className="text-left p-2">Region</th>
                  <th className="text-left p-2">Venue</th>
                </tr>
              </thead>
              <tbody>
                {scouts.map((s, i) => (
                  <tr key={i} className="border-b hover:bg-muted/40">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2 text-right font-mono">{s.mark}</td>
                    <td className="p-2 text-right font-semibold">{s.score}</td>
                    <td className={`p-2 text-right ${s.gapToRFBest === null ? "text-muted-foreground" : s.gapToRFBest <= 0 ? "text-emerald-600 font-semibold" : "text-amber-600"}`}>
                      {s.gapToRFBest !== null
                        ? s.gapToRFBest <= 0 ? `+${Math.abs(s.gapToRFBest)} ahead` : `-${s.gapToRFBest}`
                        : "—"}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">{s.region}</Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground truncate max-w-[150px]">{s.venue}</td>
                  </tr>
                ))}
                {!loading && scouts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No non-RF Indian athletes found for this event</td>
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
