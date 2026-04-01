import { useEffect, useState, useCallback } from "react";
import { useTeam } from "@/context/TeamContext";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { MasBadge } from "@/components/MasBadge";
import { formatBroncho } from "@/lib/utils";
import { fetchTeamAvgBroncho, fetchLatestSessionResults, fetchPlayers, fetchMostImprovedPlayer } from "@/lib/queries";
import { MAS_TIERS, type Player, type TestResult, type TestSession } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { Users, Timer, TrendingUp, AlertCircle, BarChart2 } from "lucide-react";

interface LatestData {
  session: TestSession | null;
  results: (TestResult & { players: Pick<Player, "name" | "code" | "team"> })[];
}

function MetricCard({ title, value, sub, icon: _icon, highlight }: { title: string; value: string | number; sub?: string; icon?: React.ElementType; highlight?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 card-hover relative overflow-hidden">
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/6 to-transparent pointer-events-none" />
      )}
      <div className="mb-3">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em]">{title}</span>
      </div>
      <div className={`text-3xl font-bold tracking-tight ${highlight ? "text-yellow-500 dark:text-yellow-400" : "text-slate-800 dark:text-slate-100"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-slate-600 mt-1.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { team } = useTeam();
  const [players, setPlayers] = useState<Player[]>([]);
  const [latestData, setLatestData] = useState<LatestData | null>(null);
  const [chartData, setChartData] = useState<{ date: string; avg: string; mins: number }[]>([]);
  const [mostImproved, setMostImproved] = useState<{ name: string; improvementSecs: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, latest, avgs, improved] = await Promise.all([
        fetchPlayers(team),
        fetchLatestSessionResults(team),
        fetchTeamAvgBroncho(team),
        fetchMostImprovedPlayer(team),
      ]);
      setPlayers(ps);
      setLatestData(latest);
      setMostImproved(improved);
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{team} <span className="text-slate-400 dark:text-slate-500 font-normal">— Dashboard</span></h1>
          <p className="text-sm text-slate-500 dark:text-slate-600 mt-1">
            {latestSession ? `Latest: ${latestSession.test_name} · ${latestSession.test_date}` : "No sessions recorded yet"}
          </p>
        </div>
        <TeamSwitcher />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              title="Most Improved"
              value={mostImproved?.name ?? "—"}
              icon={TrendingUp}
              highlight={!!mostImproved}
              sub={mostImproved ? `↓ ${mostImproved.improvementSecs}s improvement` : "Need 2+ sessions"}
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
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-5">Team Avg Broncho Over Time</h2>
          {loading ? (
            <ChartSkeleton height={200} />
          ) : chartData.length === 0 ? (
            <EmptyState icon={Timer} title="No data yet" description="Record a fitness test to see trends" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickFormatter={(v) => formatBroncho(v)}
                  domain={["auto", "auto"]}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: "rgba(10,15,36,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, backdropFilter: "blur(12px)" }}
                  labelStyle={{ color: "#94a3b8", fontSize: 11 }}
                  itemStyle={{ color: "#818cf8" }}
                  formatter={(v: number) => [formatBroncho(v), "Avg Broncho"]}
                />
                <Line type="monotone" dataKey="mins" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: "#4f46e5", r: 4, strokeWidth: 2, stroke: "rgba(79,70,229,0.3)" }} activeDot={{ r: 6, fill: "#4f46e5" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* MAS tier distribution */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-5">MAS Tier Distribution</h2>
          {loading ? (
            <ChartSkeleton height={200} />
          ) : tierCounts.length === 0 ? (
            <EmptyState icon={BarChart2} title="No MAS data yet" description="MAS scores will appear after a fitness test" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tierCounts} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="tier" tick={{ fill: "currentColor", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(10,15,36,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, backdropFilter: "blur(12px)" }}
                  labelStyle={{ color: "#94a3b8", fontSize: 11 }}
                  formatter={(v: number) => [v, "Players"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
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
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em]">Latest Session: {latestSession.test_name}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-600 bg-black/[0.04] dark:bg-white/[0.04] px-2 py-0.5 rounded-full">{latestResults.length} results</span>
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
