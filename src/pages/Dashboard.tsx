import { useEffect, useState, useCallback } from "react";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/Skeleton";
import { fetchWAAthleteProfiles, getUniqueEvents } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { type WAAthleteProfile } from "@/lib/types";

const EVENT_COLORS = [
  { color: "#818cf8", bg: "bg-indigo-400/10" },
  { color: "#60a5fa", bg: "bg-blue-400/10" },
  { color: "#34d399", bg: "bg-emerald-400/10" },
  { color: "#fbbf24", bg: "bg-amber-400/10" },
  { color: "#f87171", bg: "bg-red-400/10" },
  { color: "#a78bfa", bg: "bg-violet-400/10" },
  { color: "#2dd4bf", bg: "bg-teal-400/10" },
  { color: "#fb923c", bg: "bg-orange-400/10" },
];

export default function Dashboard() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWAAthleteProfiles();
      setAthletes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Get unique events and count athletes per event, separated by gender
  const womensEventCounts: Record<string, number> = {};
  const mensEventCounts: Record<string, number> = {};
  
  athletes.forEach((athlete) => {
    if (athlete.reliance_events) {
      const events = athlete.reliance_events.split(',').map(e => e.trim());
      events.forEach(event => {
        if (athlete.gender === 'F') {
          womensEventCounts[event] = (womensEventCounts[event] || 0) + 1;
        } else if (athlete.gender === 'M') {
          mensEventCounts[event] = (mensEventCounts[event] || 0) + 1;
        }
      });
    }
  });
  
  const womensEvents = Object.entries(womensEventCounts).sort((a, b) => b[1] - a[1]);
  const mensEvents = Object.entries(mensEventCounts).sort((a, b) => b[1] - a[1]);

  // Athletes by gender
  const maleCount = athletes.filter(a => a.gender === 'M').length;
  const femaleCount = athletes.filter(a => a.gender === 'F').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Athlete Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{athletes.length} total athletes</p>
        </div>
      </div>

      {/* Top stat strip */}
      <div className="max-w-xs border border-border rounded-2xl overflow-hidden bg-card">
        {loading ? (
          <MetricCardSkeleton />
        ) : (
          <div className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Total Athletes</div>
            <div className="text-2xl font-bold text-foreground">{athletes.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {femaleCount} female · {maleCount} male
            </div>
          </div>
        )}
      </div>

      {/* Women's Events */}
      {womensEvents.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Women's Events</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)
            ) : (
              womensEvents.map(([event, count], idx) => {
                const cfg = EVENT_COLORS[idx % EVENT_COLORS.length];
                return (
                  <a
                    key={event}
                    href={`/events/${encodeURIComponent(event)}`}
                    className="block bg-card border border-border rounded-xl p-4 hover:border-indigo-400 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate" title={event}>
                        {event}
                      </div>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Men's Events */}
      {mensEvents.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Men's Events</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)
            ) : (
              mensEvents.map(([event, count], idx) => {
                const cfg = EVENT_COLORS[idx % EVENT_COLORS.length];
                return (
                  <a
                    key={event}
                    href={`/events/${encodeURIComponent(event)}`}
                    className="block bg-card border border-border rounded-xl p-4 hover:border-indigo-400 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate" title={event}>
                        {event}
                      </div>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
