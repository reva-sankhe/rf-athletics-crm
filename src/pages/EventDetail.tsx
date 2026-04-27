import { useEffect, useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { fetchWAAthleteProfiles } from "@/lib/queries";
import { TableSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { type WAAthleteProfile } from "@/lib/types";
import { Trophy, ArrowLeft, Medal } from "lucide-react";

export default function EventDetail() {
  const [, params] = useRoute("/events/:event");
  const eventName = params?.event ? decodeURIComponent(params.event) : "";
  
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWAAthleteProfiles();
      // Filter athletes that have this event
      const filtered = data.filter(athlete => 
        athlete.reliance_events?.split(',').map(e => e.trim()).includes(eventName)
      );
      setAthletes(filtered);
    } catch (error) {
      console.error('Error loading athletes:', error);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, [eventName]);

  useEffect(() => { load(); }, [load]);

  const maleAthletes = athletes.filter(a => a.gender === 'M');
  const femaleAthletes = athletes.filter(a => a.gender === 'F');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <a className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </a>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {eventName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} · {maleAthletes.length} male · {femaleAthletes.length} female
          </p>
        </div>
      </div>

      {/* Records */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* National Record */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Medal size={16} className="text-amber-400" />
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">National Record</div>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">—</div>
          <div className="text-xs text-muted-foreground">No data available</div>
        </div>

        {/* World Record */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-[#00A651]" />
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">World Record</div>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">—</div>
          <div className="text-xs text-muted-foreground">No data available</div>
        </div>
      </div>

      {/* Athletes Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Athletes</div>
        </div>
        {loading ? (
          <div className="p-4"><TableSkeleton rows={8} cols={4} /></div>
        ) : athletes.length === 0 ? (
          <EmptyState 
            icon={Trophy} 
            title="No athletes found" 
            description="No athletes are registered for this event" 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Age</th>
                  <th className="px-4 py-2.5 text-left font-medium">Gender</th>
                  <th className="px-4 py-2.5 text-left font-medium">Best Performance</th>
                </tr>
              </thead>
              <tbody>
                {athletes
                  .sort((a, b) => (a.reliance_name || "").localeCompare(b.reliance_name || ""))
                  .map((athlete) => (
                    <tr 
                      key={athlete.aa_athlete_id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <Link href={`/athletes/${athlete.aa_athlete_id}`}>
                          <a className="hover:text-[#00A651] transition-colors">
                            {athlete.reliance_name || "—"}
                          </a>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {athlete.age ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {athlete.gender ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        —
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
