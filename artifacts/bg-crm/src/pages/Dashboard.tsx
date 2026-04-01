import { useEffect, useState, useCallback } from "react";
import { useTeam } from "@/context/TeamContext";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { MasBadge } from "@/components/MasBadge";
import { formatBroncho } from "@/lib/utils";
import { fetchTeamAvgBroncho, fetchLatestSessionResults, fetchPlayers } from "@/lib/queries";
import { MAS_TIERS, type Player, type TestResult, type TestSession } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { Users, Timer, TrendingUp, AlertCircle, BarChart2 } from "lucide-react";

interface LatestData {
  session: TestSession | null;
  results: (TestResult & { players: Pick<Player, "name" | "code" | "team"> })[];
}

function MetricCard({ title, value, sub, icon: Icon, highlight }: { title: string; value: string | number; sub?: string; icon: React.ElementType; highlight?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
          <Icon size={14} className="text-muted-foreground" />
        </div>
      </div>
      <div className={`text-2xl font-bold font-time ${highlight ? "text-yellow-400" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { team } = useTeam();
  const [players, setPlayers] = useState<Player[]>([]);
  const [latestData, setLatestData] = useState<LatestData | null>(null);
  const [chartData, setChartData] = useState<{ date: string; avg: string; mins: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, latest, avgs] = await Promise.all([
        fetchPlayers(team),
        fetchLatestSessionResults(team),
        fetchTeamAvgBroncho(team),
      ]);
      setPlayers(ps);
      setLatestData(latest);
      setChartData(
        avgs.map((a) => ({
          date: a.session.test_date,
          avg: formatBroncho(a.avgBronchoMins),
          mins: a.avgBronchoMins,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => { load(); }, [load]);

  const activePlayers = players.filter((p) => p.is_active);
  const latestResults = latestData?.results ?? [];
  const latestSession = latestData?.session ?? null;

  const avgBronchoMins = latestResults.length
    ? latestResults.reduce((s, r) => s + (r.bronco_mins ?? 0), 0) / latestResults.filter((r) => r.bronco_mins !== null).length
    : null;

  // Most improved: biggest bronco improvement across all sessions
  const mostImproved = (() => {
    if (latestResults.length < 1) return null;
    // For simplicity show player with lowest bronco in latest session (best performer)
    const withBronco = latestResults.filter((r) => r.bronco_mins !== null);
    if (!withBronco.length) return null;
    const best = withBronco.reduce((a, b) => (a.bronco_mins! < b.bronco_mins! ? a : b));
    return best.players?.name ?? null;
  })();

  // Players not yet tested in latest session
  const testedPlayerIds = new Set(latestResults.map((r) => r.player_id));
  const notTested = latestSession ? activePlayers.filter((p) => !testedPlayerIds.has(p.id)).length : 0;

  // Tier distribution
  const tierCounts = MAS_TIERS.map((tier) => ({
    tier: tier.label,
    count: latestResults.filter((r) => r.mas_ms !== null && r.mas_ms >= tier.min && r.mas_ms < tier.max).length,
    color: tier.color,
  })).filter((t) => t.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{team} — Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {latestSession ? `Latest session: ${latestSession.test_name} (${latestSession.test_date})` : "No sessions recorded yet"}
          </p>
        </div>
        <TeamSwitcher />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard title="Active Players" value={activePlayers.length} icon={Users} sub={`${players.length} total`} />
            <MetricCard
              title="Avg Broncho"
              value={avgBronchoMins !== null && !isNaN(avgBronchoMins) ? formatBroncho(avgBronchoMins) : "—"}
              icon={Timer}
              sub={latestSession ? latestSession.test_name : "No data"}
            />
            <MetricCard
              title="Top Performer"
              value={mostImproved ?? "—"}
              icon={TrendingUp}
              highlight={!!mostImproved}
              sub="Best Broncho this session"
            />
            <MetricCard
              title="Not Yet Tested"
              value={latestSession ? notTested : "—"}
              icon={AlertCircle}
              sub={latestSession ? "This session" : "No session"}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Broncho over time */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Team Avg Broncho Over Time</h2>
          {loading ? (
            <ChartSkeleton height={200} />
          ) : chartData.length === 0 ? (
            <EmptyState icon={Timer} title="No data yet" description="Record a fitness test to see trends" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(v) => formatBroncho(v)}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6 }}
                  labelStyle={{ color: "#fff", fontSize: 12 }}
                  formatter={(v: number) => [formatBroncho(v), "Avg Broncho"]}
                />
                <Line type="monotone" dataKey="mins" stroke="#4F46E5" strokeWidth={2} dot={{ fill: "#4F46E5", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* MAS tier distribution */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">MAS Tier Distribution</h2>
          {loading ? (
            <ChartSkeleton height={200} />
          ) : tierCounts.length === 0 ? (
            <EmptyState icon={BarChart2} title="No MAS data yet" description="MAS scores will appear after a fitness test" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tierCounts} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="tier" tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6 }}
                  labelStyle={{ color: "#fff", fontSize: 12 }}
                  formatter={(v: number) => [v, "Players"]}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {tierCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Latest session results */}
      {latestSession && (
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Latest Session: {latestSession.test_name}</h2>
            <span className="text-xs text-muted-foreground">{latestResults.length} results</span>
          </div>
          {loading ? (
            <div className="p-4"><ChartSkeleton height={120} /></div>
          ) : latestResults.length === 0 ? (
            <EmptyState icon={Users} title="No results" description="No results for this team in the latest session" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="latest-results-table">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Player</th>
                    <th className="px-4 py-2 text-right font-medium">Broncho</th>
                    <th className="px-4 py-2 text-right font-medium">MAS</th>
                    <th className="px-4 py-2 text-right font-medium">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {latestResults.slice(0, 10).map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-foreground">{r.players?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-time text-foreground">{formatBroncho(r.bronco_mins)}</td>
                      <td className="px-4 py-2.5 text-right font-time text-foreground">
                        {r.mas_ms !== null ? r.mas_ms.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <MasBadge mas={r.mas_ms} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
