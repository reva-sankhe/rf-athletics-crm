import { useEffect, useState, useCallback } from "react";
import { MetricCardSkeleton } from "@/components/Skeleton";
import { fetchWAAthleteProfiles } from "@/lib/queries";
import { type WAAthleteProfile } from "@/lib/types";

const EVENT_COLORS = [
  { color: "#00A651", bg: "bg-primary/10" },
  { color: "#D8B365", bg: "bg-secondary/10" },
  { color: "#6B7280", bg: "bg-gray-500/10" },
  { color: "#9CA3AF", bg: "bg-gray-400/10" },
  { color: "#00A651", bg: "bg-primary/10" },
  { color: "#D8B365", bg: "bg-secondary/10" },
  { color: "#6B7280", bg: "bg-gray-500/10" },
  { color: "#9CA3AF", bg: "bg-gray-400/10" },
];

export default function Events() {
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

  const maleCount = athletes.filter(a => a.gender === 'M').length;
  const femaleCount = athletes.filter(a => a.gender === 'F').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            RF Events
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of athlete performance and events</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg overflow-hidden bg-card p-4">
          {loading ? (
            <MetricCardSkeleton />
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Total Athletes</div>
              <div className="text-3xl font-bold text-foreground">{athletes.length}</div>
            </>
          )}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card p-4">
          {loading ? (
            <MetricCardSkeleton />
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Female Athletes</div>
              <div className="text-3xl font-bold text-foreground">{femaleCount}</div>
            </>
          )}
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card p-4">
          {loading ? (
            <MetricCardSkeleton />
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Male Athletes</div>
              <div className="text-3xl font-bold text-foreground">{maleCount}</div>
            </>
          )}
        </div>
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
                    className="block bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate" title={event}>
                        {event}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{count}</div>
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
                    className="block bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate" title={event}>
                        {event}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{count}</div>
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
