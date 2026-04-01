import { useEffect, useState, useCallback } from "react";
import { useTeam } from "@/context/TeamContext";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import { MasBadge } from "@/components/MasBadge";
import { ChartSkeleton, TableSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatBroncho, formatBronchoDiff } from "@/lib/utils";
import { getMasTier, MAS_TIERS, type Player, type TestResult, type TestSession } from "@/lib/types";
import { fetchAllResults, fetchSessions, fetchPlayers } from "@/lib/queries";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend,
} from "recharts";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";

const TABS = [
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "position", label: "By Position", icon: Users },
  { id: "age", label: "By Age Group", icon: Users },
  { id: "benchmarks", label: "Benchmarks", icon: Target },
];

interface EnrichedResult extends TestResult {
  players?: Pick<Player, "name" | "code" | "team" | "primary_position" | "age_range">;
  test_sessions?: Pick<TestSession, "test_date" | "test_name">;
}

export default function Analytics() {
  const { team } = useTeam();
  const [tab, setTab] = useState("progress");
  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rs, ss, ps] = await Promise.all([fetchAllResults(), fetchSessions(), fetchPlayers(team)]);
      setResults(rs as EnrichedResult[]);
      setSessions(ss);
      setPlayers(ps);
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => { load(); }, [load]);

  const teamResults = results.filter((r) => r.players?.team === team);

  // Progress tab: line chart of team avg broncho over time, per-player table
  const progressData = (() => {
    const sorted = [...sessions].reverse();
    return sorted.map((s) => {
      const srs = teamResults.filter((r) => r.session_id === s.id && r.bronco_mins !== null);
      const avg = srs.length ? srs.reduce((a, r) => a + r.bronco_mins!, 0) / srs.length : null;
      return { date: s.test_date, name: s.test_name, avg, avgDisplay: formatBroncho(avg) };
    }).filter((d) => d.avg !== null);
  })();

  // Per-player progress table
  const playerProgress = (() => {
    const sorted = [...sessions].reverse();
    return players.map((p) => {
      const playerResults = sorted.map((s) => {
        const r = teamResults.find((r) => r.player_id === p.id && r.session_id === s.id);
        return { session: s.test_name, date: s.test_date, bronco_mins: r?.bronco_mins ?? null };
      }).filter((x) => x.bronco_mins !== null);
      const first = playerResults[0];
      const last = playerResults[playerResults.length - 1];
      const diffSecs = first && last && first !== last
        ? Math.round((last.bronco_mins! - first.bronco_mins!) * 60)
        : null;
      const pct = first && diffSecs !== null && first.bronco_mins
        ? ((diffSecs / (first.bronco_mins * 60)) * 100).toFixed(1)
        : null;
      return { player: p, results: playerResults, last: last?.bronco_mins ?? null, diffSecs, pct };
    });
  })();

  // By position data
  const positionData = (() => {
    const positions = [...new Set(players.map((p) => p.primary_position))].sort();
    const sortedSessions = [...sessions].reverse().slice(-4);
    return positions.map((pos) => {
      const obj: Record<string, string | number> = { position: pos };
      sortedSessions.forEach((s) => {
        const rs = teamResults.filter((r) => r.session_id === s.id && r.bronco_mins !== null && r.players?.primary_position === pos);
        const avg = rs.length ? rs.reduce((a, r) => a + r.bronco_mins!, 0) / rs.length : 0;
        obj[s.test_name] = avg;
      });
      return obj;
    });
  })();

  const recentSessions = [...sessions].reverse().slice(-4);
  const SESSION_COLORS = ["#4F46E5", "#10b981", "#f97316", "#3b82f6"];

  // By age group data
  const ageData = (() => {
    const ranges = ["U18", "18-24", "25+"];
    return ranges.map((range) => {
      const obj: Record<string, string | number> = { range };
      recentSessions.forEach((s) => {
        const rs = teamResults.filter((r) => r.session_id === s.id && r.bronco_mins !== null && r.players?.age_range === range);
        const avg = rs.length ? rs.reduce((a, r) => a + r.bronco_mins!, 0) / rs.length : 0;
        obj[s.test_name] = avg;
      });
      return obj;
    });
  })();

  // Benchmarks: all players sorted by latest MAS
  const benchmarkData = (() => {
    return players
      .map((p) => {
        const rs = teamResults.filter((r) => r.player_id === p.id && r.mas_ms !== null);
        const latest = rs.sort((a, b) => new Date(b.test_sessions?.test_date ?? "").getTime() - new Date(a.test_sessions?.test_date ?? "").getTime())[0];
        return { player: p, mas: latest?.mas_ms ?? null };
      })
      .filter((x) => x.mas !== null)
      .sort((a, b) => b.mas! - a.mas!);
  })();

  const tierThresholds = [4.5, 4.3, 4.1, 3.9, 3.7, 3.5];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Analytics <span className="text-slate-400 dark:text-slate-500 font-normal">— {team}</span></h1>
        <TeamSwitcher />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit border border-border" data-testid="analytics-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "progress" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Team Avg Broncho Over Time</h2>
            {loading ? <ChartSkeleton /> : progressData.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No data" description="Record fitness tests to see progress" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={progressData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatBroncho(v)} domain={["auto", "auto"]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6 }} labelStyle={{ color: "#fff", fontSize: 12 }} formatter={(v: number) => [formatBroncho(v), "Avg"]} />
                  <Line type="monotone" dataKey="avg" stroke="#4F46E5" strokeWidth={2} dot={{ fill: "#4F46E5", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Player Progress</h2>
            </div>
            {loading ? <div className="p-4"><TableSkeleton /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="progress-table">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-medium">Player</th>
                      <th className="px-4 py-2.5 text-right font-medium">Latest Broncho</th>
                      <th className="px-4 py-2.5 text-right font-medium">Change</th>
                      <th className="px-4 py-2.5 text-right font-medium">% Change</th>
                      <th className="px-4 py-2.5 text-right font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerProgress.map(({ player, last, diffSecs, pct }) => (
                      <tr key={player.id} className="border-b border-border/50 hover:bg-muted/30" data-testid={`row-progress-${player.id}`}>
                        <td className="px-4 py-2.5 text-foreground">{player.name}</td>
                        <td className="px-4 py-2.5 text-right font-time">{formatBroncho(last)}</td>
                        <td className={`px-4 py-2.5 text-right font-time text-xs ${diffSecs !== null ? (diffSecs < 0 ? "text-emerald-400" : "text-red-400") : "text-muted-foreground"}`}>
                          {diffSecs !== null ? formatBronchoDiff(diffSecs) : "—"}
                        </td>
                        <td className={`px-4 py-2.5 text-right text-xs ${pct !== null ? (parseFloat(pct) < 0 ? "text-emerald-400" : "text-red-400") : "text-muted-foreground"}`}>
                          {pct !== null ? `${pct}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-base">
                          {diffSecs === null ? "—" : diffSecs < 0 ? "↑" : diffSecs > 0 ? "↓" : "→"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "position" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Avg Broncho by Position</h2>
            {loading ? <ChartSkeleton /> : positionData.length === 0 ? (
              <EmptyState icon={BarChart3} title="No data" description="No position data available" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={positionData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="position" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatBroncho(v)} domain={["auto", "auto"]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6 }} labelStyle={{ color: "#fff", fontSize: 12 }} formatter={(v: number) => [formatBroncho(v), "Avg Broncho"]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
                  {recentSessions.map((s, i) => (
                    <Bar key={s.id} dataKey={s.test_name} fill={SESSION_COLORS[i % SESSION_COLORS.length]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">By Position Summary</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="position-summary-table">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Position</th>
                    {recentSessions.map((s) => <th key={s.id} className="px-4 py-2 text-right font-medium">{s.test_name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {positionData.map((row) => (
                    <tr key={row.position as string} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.position as string}</td>
                      {recentSessions.map((s) => (
                        <td key={s.id} className="px-4 py-2.5 text-right font-time text-muted-foreground">{row[s.test_name] ? formatBroncho(row[s.test_name] as number) : "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "age" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Avg Broncho by Age Group</h2>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ageData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="range" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatBroncho(v)} domain={["auto", "auto"]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6 }} labelStyle={{ color: "#fff", fontSize: 12 }} formatter={(v: number) => [formatBroncho(v), "Avg Broncho"]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
                  {recentSessions.map((s, i) => (
                    <Bar key={s.id} dataKey={s.test_name} fill={SESSION_COLORS[i % SESSION_COLORS.length]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">By Age Group Summary</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="age-summary-table">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Age Group</th>
                    {recentSessions.map((s) => <th key={s.id} className="px-4 py-2 text-right font-medium">{s.test_name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ageData.map((row) => (
                    <tr key={row.range as string} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.range as string}</td>
                      {recentSessions.map((s) => (
                        <td key={s.id} className="px-4 py-2.5 text-right font-time text-muted-foreground">{row[s.test_name] ? formatBroncho(row[s.test_name] as number) : "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "benchmarks" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Player MAS Benchmarks</h2>
            {loading ? <ChartSkeleton height={300} /> : benchmarkData.length === 0 ? (
              <EmptyState icon={Target} title="No MAS data" description="MAS scores will appear after fitness tests are recorded" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, benchmarkData.length * 30)}>
                <BarChart data={benchmarkData.map((d) => ({ name: d.player.name, mas: d.mas, tier: getMasTier(d.mas!).label }))} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                  <XAxis type="number" domain={[3.0, 5.0]} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickCount={10} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} width={75} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6 }}
                    labelStyle={{ color: "#fff", fontSize: 12 }}
                    formatter={(v: number, _n: string, props) => [v.toFixed(2) + " m/s", props.payload.tier]}
                  />
                  {tierThresholds.map((t) => (
                    <ReferenceLine key={t} x={t} stroke="#444" strokeDasharray="4 2" />
                  ))}
                  <Bar dataKey="mas" radius={[0, 3, 3, 0]} minPointSize={2}>
                    {benchmarkData.map((entry, i) => (
                      <Cell key={i} fill={getMasTier(entry.mas!).color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tier legend */}
          <div className="flex flex-wrap gap-2">
            {MAS_TIERS.map((tier) => (
              <div key={tier.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: tier.color }} />
                {tier.label} ({tier.min === 0 ? "<3.5" : tier.max === Infinity ? ">4.5" : `${tier.min}–${tier.max}`})
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">Benchmarks Table</h2></div>
            {loading ? <div className="p-4"><TableSkeleton /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="benchmarks-table">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-medium">#</th>
                      <th className="px-4 py-2.5 text-left font-medium">Player</th>
                      <th className="px-4 py-2.5 text-right font-medium">MAS (m/s)</th>
                      <th className="px-4 py-2.5 text-right font-medium">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkData.map(({ player, mas }, i) => (
                      <tr key={player.id} className="border-b border-border/50 hover:bg-muted/30" data-testid={`row-benchmark-${player.id}`}>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs font-time">{i + 1}</td>
                        <td className="px-4 py-2.5 text-foreground">{player.name}</td>
                        <td className="px-4 py-2.5 text-right font-time text-foreground">{mas?.toFixed(2) ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right"><MasBadge mas={mas} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
