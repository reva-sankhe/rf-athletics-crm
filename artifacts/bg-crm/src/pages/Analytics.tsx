import { useEffect, useState, useCallback, useMemo } from "react";
import { useTeam } from "@/context/TeamContext";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import { ChartSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatBroncho } from "@/lib/utils";
import { getMasTier, MAS_TIERS, type Player, type TestResult, type TestSession } from "@/lib/types";
import { fetchAllResults, fetchSessions, fetchPlayers } from "@/lib/queries";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

// ── Position helpers ───────────────────────────────────────────────────────
const POS_CFG: Record<string, { label: string; color: string; tailwindText: string; tailwindBg: string }> = {
  F:  { label: "F",  color: "#f87171", tailwindText: "text-red-400",    tailwindBg: "bg-red-400/15"    },
  M:  { label: "M",  color: "#60a5fa", tailwindText: "text-blue-400",   tailwindBg: "bg-blue-400/15"   },
  D:  { label: "D",  color: "#818cf8", tailwindText: "text-indigo-400", tailwindBg: "bg-indigo-400/15" },
  GK: { label: "GK", color: "#fbbf24", tailwindText: "text-amber-400",  tailwindBg: "bg-amber-400/15"  },
};
function getPos(pos: string | null) { return POS_CFG[pos ?? ""] ?? { label: pos ?? "?", color: "#9ca3af", tailwindText: "text-slate-400", tailwindBg: "bg-slate-400/15" }; }

function PosBadge({ pos }: { pos: string | null }) {
  const cfg = getPos(pos);
  return (
    <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold font-time", cfg.tailwindText, cfg.tailwindBg)}>
      {cfg.label}
    </span>
  );
}

// ── Change badge ───────────────────────────────────────────────────────────
function ChangeBadge({ diffSecs }: { diffSecs: number | null }) {
  if (diffSecs === null) return <span className="text-xs text-muted-foreground font-time">—</span>;
  if (Math.abs(diffSecs) <= 3) return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-time bg-amber-400/15 text-amber-400">—</span>;
  if (diffSecs > 0) return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-time bg-emerald-400/15 text-emerald-400">▲ {diffSecs}s</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-time bg-red-400/15 text-red-400">▼ {Math.abs(diffSecs)}s</span>;
}

// ── Tier badge ─────────────────────────────────────────────────────────────
function TierBadge({ mas }: { mas: number | null }) {
  if (!mas) return <span className="text-xs text-muted-foreground">—</span>;
  const t = getMasTier(mas);
  return <span className="text-xs font-medium" style={{ color: t.color }}>{t.label}</span>;
}

// ── Bar row (CSS-based, no Recharts) ──────────────────────────────────────
function BarRow({ name, bronco, maxBronco, color, prefix }: { name: string; bronco: number; maxBronco: number; color: string; prefix?: React.ReactNode }) {
  const pct = Math.min(100, (bronco / maxBronco) * 100);
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="min-w-[120px] text-xs text-foreground flex items-center gap-1.5">{prefix}{name}</div>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="min-w-[38px] text-right text-[11px] font-time text-muted-foreground">{formatBroncho(bronco)}</div>
    </div>
  );
}

// ── Metric strip ──────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, valueColor }: { label: string; value: string | number; sub?: string; valueColor?: string }) {
  return (
    <div className="py-4 px-5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className={cn("text-2xl font-bold font-time leading-none", valueColor ?? "text-foreground")}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

// ── Benchmark tier strip ───────────────────────────────────────────────────
function TierStrip({ players: ps, results: rs }: { players: { player: Player; mas: number | null }[]; results: never[] }) {
  const _ = rs;
  return (
    <div className="space-y-1">
      {MAS_TIERS.map((t) => {
        const inTier = ps.filter((x) => x.mas !== null && x.mas >= t.min && (t.max === Infinity ? true : x.mas < t.max));
        return (
          <div key={t.label}>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border" style={{ backgroundColor: t.color + "12", borderColor: t.color + "30" }}>
              <span className="text-xs font-semibold min-w-[110px]" style={{ color: t.color }}>{t.label}</span>
              <span className="text-[11px] font-time text-muted-foreground min-w-[90px]">
                {t.max === Infinity ? `>${t.min.toFixed(1)} m/s` : t.min === 0 ? `<${t.max.toFixed(1)} m/s` : `${t.min.toFixed(1)}–${t.max.toFixed(1)} m/s`}
              </span>
              <span className="text-[11px] text-muted-foreground flex-1 hidden sm:block">
                {t.label === "World Record" ? "Top 1% — professional athletes"
                  : t.label === "Elite Pro" ? "International & top-tier pro"
                  : t.label === "Outstanding" ? "High-level competitive"
                  : t.label === "Very Good" ? "Competitive club / college"
                  : t.label === "Good" ? "Above average, suitable for competition"
                  : t.label === "Average" ? "Average fitness for team sports"
                  : "Needs improvement"}
              </span>
              <span className="ml-auto text-sm font-bold font-time" style={{ color: t.color }}>{inTier.length}</span>
            </div>
            {inTier.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                {inTier.map(({ player, mas }) => (
                  <div key={player.id} title={`${player.name} · ${mas?.toFixed(2)} m/s`}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold font-time cursor-default"
                    style={{ backgroundColor: t.color + "22", color: t.color, border: `1px solid ${t.color}44` }}>
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────
interface EnrichedResult extends TestResult {
  players?: Pick<Player, "name" | "code" | "team" | "primary_position" | "age_range">;
  test_sessions?: Pick<TestSession, "test_date" | "test_name" | "type">;
}

const TABS = ["overview", "benchmarks", "players", "position", "age"] as const;
type TabId = typeof TABS[number];
const TAB_LABELS: Record<TabId, string> = {
  overview:   "Overview",
  benchmarks: "Benchmarks",
  players:    "Players",
  position:   "By Position",
  age:        "By Age Group",
};

// ── Main component ────────────────────────────────────────────────────────
export default function Analytics() {
  const { team } = useTeam();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<TabId>("overview");
  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [posFilter, setPosFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rs, ss, ps] = await Promise.all([fetchAllResults(), fetchSessions(), fetchPlayers(team)]);
      setResults(rs as EnrichedResult[]);
      setSessions(ss);
      setPlayers(ps);
    } finally { setLoading(false); }
  }, [team]);

  useEffect(() => { load(); }, [load]);

  const teamResults = useMemo(() => results.filter((r) => r.players?.team === team), [results, team]);

  // Distinct non-null session types, sorted
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(sessions.map((s) => s.type).filter(Boolean) as string[])).sort();
    return types;
  }, [sessions]);

  // Reset typeFilter if it no longer exists in current sessions
  const validTypeFilter = availableTypes.includes(typeFilter) ? typeFilter : "all";

  // All sessions chronologically, filtered by type when one is selected
  const chronoSessions = useMemo(() => {
    const sorted = [...sessions].reverse();
    return validTypeFilter === "all" ? sorted : sorted.filter((s) => s.type === validTypeFilter);
  }, [sessions, validTypeFilter]);

  // Per-player: first & latest bronco
  const playerComparisons = useMemo(() => {
    return players.map((p) => {
      const pResults = chronoSessions
        .map((s) => {
          const r = teamResults.find((r) => r.player_id === p.id && r.session_id === s.id && r.bronco_mins !== null);
          return r ? { date: s.test_date, sessionName: s.test_name, bronco_mins: r.bronco_mins!, mas_ms: r.mas_ms } : null;
        })
        .filter(Boolean) as { date: string; sessionName: string; bronco_mins: number; mas_ms: number | null }[];

      const first = pResults[0] ?? null;
      const latest = pResults[pResults.length - 1] ?? null;
      const diffSecs = first && latest && first !== latest
        ? Math.round((first.bronco_mins - latest.bronco_mins) * 60)
        : null;
      return { player: p, first, latest, diffSecs, pResults };
    });
  }, [players, teamResults, chronoSessions]);

  // Benchmark data
  const benchmarkData = useMemo(() => {
    return playerComparisons
      .map(({ player, latest, pResults }) => {
        const latestMas = pResults.length > 0 ? pResults[pResults.length - 1].mas_ms : null;
        return { player, mas: latestMas, bronco: latest?.bronco_mins ?? null };
      })
      .filter((x) => x.mas !== null)
      .sort((a, b) => b.mas! - a.mas!);
  }, [playerComparisons]);

  // Overview: per-player change sorted best → worst
  const changeData = useMemo(() => {
    return playerComparisons
      .filter((x) => x.diffSecs !== null)
      .sort((a, b) => b.diffSecs! - a.diffSecs!)
      .map(({ player, diffSecs, first, latest }) => ({
        name: player.name,
        diff: parseFloat(((first!.bronco_mins - latest!.bronco_mins)).toFixed(3)),
        diffSecs: diffSecs!,
        firstBronco: first!.bronco_mins,
        latestBronco: latest!.bronco_mins,
      }));
  }, [playerComparisons]);

  // Session avg over time
  const avgOverTime = useMemo(() => {
    return chronoSessions.map((s) => {
      const srs = teamResults.filter((r) => r.session_id === s.id && r.bronco_mins !== null);
      const avg = srs.length ? srs.reduce((a, r) => a + r.bronco_mins!, 0) / srs.length : null;
      return { name: s.test_name, avg };
    }).filter((x) => x.avg !== null);
  }, [chronoSessions, teamResults]);

  // Metric strip values — based on type-filtered sessions
  const latestSession = chronoSessions.length > 0 ? chronoSessions[chronoSessions.length - 1] : null;
  const latestResults = teamResults.filter((r) => r.session_id === latestSession?.id && r.bronco_mins !== null);
  const latestAvg = latestResults.length ? latestResults.reduce((a, r) => a + r.bronco_mins!, 0) / latestResults.length : null;
  const comparable = playerComparisons.filter((x) => x.diffSecs !== null);
  const improved = comparable.filter((x) => x.diffSecs! > 3).length;
  const declined = comparable.filter((x) => x.diffSecs! < -3).length;

  // Position data
  const positions = useMemo(() => ["F", "M", "D", "GK"], []);
  const ageRanges = useMemo(() => ["U18", "18-24", "25+"], []);

  const chartGrid = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
  const chartAxis = isDark ? "#6b7280" : "#9ca3af";
  const chartTooltipBg = isDark ? "#0f172a" : "#ffffff";
  const chartTooltipBorder = isDark ? "#1e293b" : "#e2e8f0";

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-foreground">
            Analytics <em className="italic text-indigo-500 dark:text-indigo-400 not-italic font-serif">— {team}</em>
          </h1>
          {latestSession && (
            <p className="text-sm text-muted-foreground mt-0.5">Latest: {latestSession.test_name} · {latestSession.test_date}</p>
          )}
        </div>
        <TeamSwitcher />
      </div>

      {/* Type filter pills — only shown when there are typed sessions */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-1">Type</span>
          {["all", ...availableTypes].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                validTypeFilter === t
                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                  : "text-muted-foreground border-transparent hover:border-border hover:text-foreground"
              )}
            >
              {t === "all" ? "All types" : t}
            </button>
          ))}
        </div>
      )}

      {/* Metric strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 border border-border rounded-2xl overflow-hidden divide-x divide-border mb-5 bg-card">
        <MetricCard label="Squad" value={players.length} sub="registered" />
        <MetricCard label="Latest test" value={latestResults.length} sub={latestSession?.test_name ?? "—"} />
        <MetricCard label="Avg broncho" value={formatBroncho(latestAvg)} sub="latest session" />
        <MetricCard label="Comparable" value={comparable.length} sub="2+ sessions" />
        <MetricCard label="Improved" value={improved} sub={`of ${comparable.length}`} valueColor="text-emerald-400" />
        <MetricCard label="Declined" value={declined} sub={`of ${comparable.length}`} valueColor="text-red-400" />
      </div>

      {/* Underline tabs */}
      <div className="border-b border-border mb-5">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-testid={`tab-${id}`}
              className={cn(
                "px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
                tab === id
                  ? "border-indigo-500 text-indigo-500 dark:border-indigo-400 dark:text-indigo-400 font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Per-player change chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              First → Latest change per player{validTypeFilter !== "all" ? ` · ${validTypeFilter} sessions` : ""}
            </div>
            <div className="flex gap-4 mb-4 mt-2">
              {[["#34d399","Improved"], ["#f87171","Declined"], ["#fbbf24","Unchanged"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}
                </div>
              ))}
            </div>
            {loading ? <ChartSkeleton height={320} /> : changeData.length === 0 ? (
              <EmptyState title="No comparable data" description="Players need 2+ test sessions to show progress" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, changeData.length * 28 + 60)}>
                <BarChart data={changeData} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v > 0 ? "+" : ""}${(v * 60).toFixed(0)}s`} tick={{ fill: chartAxis, fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: chartAxis, fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartTooltipBorder}`, borderRadius: 8 }}
                    labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 12, fontWeight: 600 }}
                    formatter={(v: number, _: string, props) => {
                      const d = props.payload;
                      return [`${d.diffSecs > 0 ? "+" : ""}${d.diffSecs}s (${formatBroncho(d.firstBronco)} → ${formatBroncho(d.latestBronco)})`, ""];
                    }}
                  />
                  <ReferenceLine x={0} stroke={isDark ? "#334155" : "#cbd5e1"} />
                  <Bar dataKey="diff" radius={3} minPointSize={2}>
                    {changeData.map((d, i) => (
                      <Cell key={i} fill={d.diffSecs > 3 ? "#34d399" : d.diffSecs < -3 ? "#f87171" : "#fbbf24"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 2-up: avg over time + MAS distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Team avg broncho over time</div>
              {loading ? <ChartSkeleton height={180} /> : avgOverTime.length < 2 ? (
                <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Need 2+ sessions</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={avgOverTime} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="name" tick={{ fill: chartAxis, fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => formatBroncho(v)} domain={["auto", "auto"]} tick={{ fill: chartAxis, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartTooltipBorder}`, borderRadius: 8 }} formatter={(v: number) => [formatBroncho(v), "Avg"]} />
                    <Bar dataKey="avg" radius={[3, 3, 0, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">MAS distribution (latest)</div>
              {loading ? <ChartSkeleton height={180} /> : (() => {
                const masValues = teamResults
                  .filter((r) => r.session_id === latestSession?.id && r.mas_ms !== null)
                  .map((r) => r.mas_ms!);
                if (!masValues.length) return <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No MAS data</div>;
                const breaks = [0, 3.0, 3.2, 3.4, 3.6, 3.8, Infinity];
                const labels = ["<3.0", "3.0–3.2", "3.2–3.4", "3.4–3.6", "3.6–3.8", "3.8+"];
                const data = labels.map((l, i) => ({ l, count: masValues.filter((v) => v >= breaks[i] && v < breaks[i + 1]).length }));
                return (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="l" tick={{ fill: chartAxis, fontSize: 10 }} />
                      <YAxis tick={{ fill: chartAxis, fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartTooltipBorder}`, borderRadius: 8 }} formatter={(v: number) => [v, "Players"]} />
                      <Bar dataKey="count" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── BENCHMARKS ───────────────────────────────────────────── */}
      {tab === "benchmarks" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Player MAS vs female athlete benchmarks</div>
            {loading ? <ChartSkeleton height={320} /> : benchmarkData.length === 0 ? (
              <EmptyState title="No MAS data" description="MAS scores will appear after fitness tests are recorded" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, benchmarkData.length * 26 + 80)}>
                <BarChart
                  data={benchmarkData.map((d) => ({ name: d.player.name, mas: d.mas, tier: getMasTier(d.mas!).label }))}
                  layout="vertical"
                  margin={{ top: 4, right: 50, bottom: 4, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                  <XAxis type="number" domain={[2.4, 4.8]} tick={{ fill: chartAxis, fontSize: 10 }} tickCount={8} />
                  <YAxis type="category" dataKey="name" tick={{ fill: chartAxis, fontSize: 11 }} width={90} />
                  {MAS_TIERS.filter((t) => t.min > 0 && t.min < 4.8).map((t) => (
                    <ReferenceLine key={t.min} x={t.min} stroke={t.color + "66"} strokeDasharray="4 3" />
                  ))}
                  <Tooltip
                    contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartTooltipBorder}`, borderRadius: 8 }}
                    labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 12, fontWeight: 600 }}
                    formatter={(v: number, _: string, props) => [`${v.toFixed(2)} m/s — ${props.payload.tier}`, ""]}
                  />
                  <Bar dataKey="mas" radius={[0, 3, 3, 0]} minPointSize={2}>
                    {benchmarkData.map((entry, i) => (
                      <Cell key={i} fill={getMasTier(entry.mas!).color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Tier distribution — {team} squad</div>
            {loading ? <ChartSkeleton /> : (
              <TierStrip players={benchmarkData} results={[] as never[]} />
            )}
          </div>
        </div>
      )}

      {/* ── PLAYERS ──────────────────────────────────────────────── */}
      {tab === "players" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Position</span>
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="bg-card border border-border rounded-lg text-sm px-2.5 py-1.5 text-foreground"
            >
              <option value="all">All</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-2">Age group</span>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="bg-card border border-border rounded-lg text-sm px-2.5 py-1.5 text-foreground"
            >
              <option value="all">All</option>
              {ageRanges.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="players-analytics-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-8"></th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Player</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Group</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">First</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Latest</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">MAS</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tier</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {playerComparisons
                    .filter((x) => (posFilter === "all" || x.player.primary_position === posFilter) && (ageFilter === "all" || x.player.age_range === ageFilter))
                    .map(({ player, first, latest, diffSecs, pResults }) => {
                      const latestMas = pResults.length > 0 ? pResults[pResults.length - 1].mas_ms : null;
                      return (
                        <tr key={player.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5"><PosBadge pos={player.primary_position} /></td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{player.name}</td>
                          <td className="px-4 py-2.5">
                            {player.age_range ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-time">{player.age_range}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-time text-muted-foreground">{first ? formatBroncho(first.bronco_mins) : <span className="text-muted-foreground/50">—</span>}</td>
                          <td className="px-4 py-2.5 text-right font-time text-foreground">{latest ? formatBroncho(latest.bronco_mins) : <span className="text-muted-foreground/50">—</span>}</td>
                          <td className="px-4 py-2.5 text-right font-time text-foreground">{latestMas?.toFixed(2) ?? <span className="text-muted-foreground/50">—</span>}</td>
                          <td className="px-4 py-2.5 text-right"><TierBadge mas={latestMas} /></td>
                          <td className="px-4 py-2.5 text-right"><ChangeBadge diffSecs={diffSecs} /></td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BY POSITION ──────────────────────────────────────────── */}
      {tab === "position" && (
        <div className="space-y-4">
          {/* Position avg chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Avg broncho by position (latest session)</div>
            {loading ? <ChartSkeleton height={200} /> : (() => {
              const data = positions.map((pos) => {
                const prs = latestResults.filter((r) => r.players?.primary_position === pos && r.bronco_mins !== null);
                const avg = prs.length ? prs.reduce((a, r) => a + r.bronco_mins!, 0) / prs.length : null;
                return { pos, avg, color: getPos(pos).color };
              }).filter((x) => x.avg !== null);
              if (!data.length) return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data for latest session</div>;
              return (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="pos" tick={{ fill: chartAxis, fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatBroncho(v)} domain={["auto", "auto"]} tick={{ fill: chartAxis, fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartTooltipBorder}`, borderRadius: 8 }} formatter={(v: number) => [formatBroncho(v), "Avg Broncho"]} />
                    <Bar dataKey="avg" radius={[3, 3, 0, 0]} minPointSize={2}>
                      {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {/* Per-position cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {positions.map((pos) => {
              const cfg = getPos(pos);
              const inPos = playerComparisons.filter((x) => x.player.primary_position === pos);
              const withLatest = inPos.filter((x) => x.latest !== null);
              const avgLatest = withLatest.length ? withLatest.reduce((a, x) => a + x.latest!.bronco_mins, 0) / withLatest.length : null;
              const maxBronco = Math.max(...withLatest.map((x) => x.latest!.bronco_mins), 8);
              if (!inPos.length) return null;
              return (
                <div key={pos} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PosBadge pos={pos} />
                    <span className="font-semibold text-foreground">
                      {pos === "F" ? "Forwards" : pos === "M" ? "Midfielders" : pos === "D" ? "Defenders" : "Goalkeepers"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{inPos.length} players</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Avg Latest</div>
                      <div className="text-xl font-bold font-time" style={{ color: cfg.color }}>{avgLatest ? formatBroncho(avgLatest) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Tested</div>
                      <div className="text-xl font-bold font-time text-foreground">{withLatest.length}</div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {withLatest
                      .sort((a, b) => a.latest!.bronco_mins - b.latest!.bronco_mins)
                      .map(({ player, latest, diffSecs }) => (
                        <BarRow
                          key={player.id}
                          name={player.name}
                          bronco={latest!.bronco_mins}
                          maxBronco={maxBronco}
                          color={cfg.color}
                          prefix={diffSecs !== null && diffSecs > 3 ? <span className="text-emerald-400 text-[10px]">▲</span> : diffSecs !== null && diffSecs < -3 ? <span className="text-red-400 text-[10px]">▼</span> : undefined}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BY AGE ────────────────────────────────────────────────── */}
      {tab === "age" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Avg broncho by age group (latest session)</div>
            {loading ? <ChartSkeleton height={200} /> : (() => {
              const AGE_COLORS: Record<string, string> = { "U18": "#f87171", "18-24": "#60a5fa", "25+": "#34d399" };
              const data = ageRanges.map((r) => {
                const prs = latestResults.filter((x) => x.players?.age_range === r && x.bronco_mins !== null);
                const avg = prs.length ? prs.reduce((a, x) => a + x.bronco_mins!, 0) / prs.length : null;
                return { range: r, avg, color: AGE_COLORS[r] };
              }).filter((x) => x.avg !== null);
              if (!data.length) return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data for latest session</div>;
              return (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="range" tick={{ fill: chartAxis, fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatBroncho(v)} domain={["auto", "auto"]} tick={{ fill: chartAxis, fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: chartTooltipBg, border: `1px solid ${chartTooltipBorder}`, borderRadius: 8 }} formatter={(v: number) => [formatBroncho(v), "Avg Broncho"]} />
                    <Bar dataKey="avg" radius={[3, 3, 0, 0]} minPointSize={2}>
                      {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {/* Per-age-group cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ageRanges.map((range) => {
              const AGE_COLORS: Record<string, string> = { "U18": "#f87171", "18-24": "#60a5fa", "25+": "#34d399" };
              const color = AGE_COLORS[range] ?? "#818cf8";
              const inRange = playerComparisons.filter((x) => x.player.age_range === range);
              const withLatest = inRange.filter((x) => x.latest !== null);
              const comparable2 = inRange.filter((x) => x.diffSecs !== null);
              const improvedInRange = comparable2.filter((x) => x.diffSecs! > 3).length;
              const avgLatest = withLatest.length ? withLatest.reduce((a, x) => a + x.latest!.bronco_mins, 0) / withLatest.length : null;
              const maxBronco = Math.max(...withLatest.map((x) => x.latest!.bronco_mins), 8);
              if (!inRange.length) return null;
              return (
                <div key={range} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold" style={{ color }}>{range}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{inRange.length} players</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Avg</div>
                      <div className="text-lg font-bold font-time" style={{ color }}>{avgLatest ? formatBroncho(avgLatest) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Tested</div>
                      <div className="text-lg font-bold font-time text-foreground">{withLatest.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Improved</div>
                      <div className="text-lg font-bold font-time text-emerald-400">{improvedInRange}</div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {withLatest
                      .sort((a, b) => a.latest!.bronco_mins - b.latest!.bronco_mins)
                      .map(({ player, latest, diffSecs }) => (
                        <BarRow
                          key={player.id}
                          name={player.name}
                          bronco={latest!.bronco_mins}
                          maxBronco={maxBronco}
                          color={color}
                          prefix={diffSecs !== null && diffSecs > 3 ? <span className="text-emerald-400 text-[10px]">▲</span> : diffSecs !== null && diffSecs < -3 ? <span className="text-red-400 text-[10px]">▼</span> : undefined}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
