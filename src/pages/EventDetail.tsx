import { useEffect, useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { fetchWAAthleteProfiles, fetchEventBenchmark, fetchPersonalBestsForEvent, upsertEventBenchmark } from "@/lib/queries";
import { TableSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { type WAAthleteProfile, type EventBenchmark, type WAAthletePersonalBest } from "@/lib/types";
import { Trophy, ArrowLeft, Medal, Target, Award, Edit2, Save, X } from "lucide-react";
import { formatPerformance } from "@/lib/eventUtils";
import { useToast } from "@/hooks/use-toast";

export default function EventDetail() {
  const [, params] = useRoute("/events/:event");
  const eventName = params?.event ? decodeURIComponent(params.event) : "";
  
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [benchmark, setBenchmark] = useState<EventBenchmark | null>(null);
  const [personalBests, setPersonalBests] = useState<Map<string, WAAthletePersonalBest>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isEditingRfTarget, setIsEditingRfTarget] = useState(false);
  const [editedRfTarget, setEditedRfTarget] = useState("");
  const [editedRfTargetNotes, setEditedRfTargetNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, benchmarkData] = await Promise.all([
        fetchWAAthleteProfiles(),
        fetchEventBenchmark(eventName)
      ]);
      
      // Filter athletes that have this event
      const filtered = data.filter(athlete => 
        athlete.reliance_events?.split(',').map(e => e.trim()).includes(eventName)
      );
      setAthletes(filtered);
      setBenchmark(benchmarkData);

      // Fetch personal bests for all filtered athletes
      if (filtered.length > 0) {
        const athleteIds = filtered.map(a => a.aa_athlete_id);
        const pbsMap = await fetchPersonalBestsForEvent(athleteIds, eventName);
        setPersonalBests(pbsMap);
      } else {
        setPersonalBests(new Map());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setAthletes([]);
      setBenchmark(null);
      setPersonalBests(new Map());
    } finally {
      setLoading(false);
    }
  }, [eventName]);

  useEffect(() => { load(); }, [load]);

  const maleAthletes = athletes.filter(a => a.gender === 'M');
  const femaleAthletes = athletes.filter(a => a.gender === 'F');

  const handleEditRfTarget = () => {
    setEditedRfTarget(benchmark?.rf_target || "");
    setEditedRfTargetNotes(benchmark?.rf_target_notes || "");
    setIsEditingRfTarget(true);
  };

  const handleCancelEdit = () => {
    setIsEditingRfTarget(false);
    setEditedRfTarget("");
    setEditedRfTargetNotes("");
  };

  const handleSaveRfTarget = async () => {
    if (!eventName) return;
    
    setIsSaving(true);
    try {
      const updatedBenchmark = await upsertEventBenchmark({
        event_name: eventName,
        rf_target: editedRfTarget || null,
        rf_target_notes: editedRfTargetNotes || null,
        // Keep existing values for other fields
        asian_games_qual_standard: benchmark?.asian_games_qual_standard || null,
        commonwealth_games_qual_standard: benchmark?.commonwealth_games_qual_standard || null,
        olympic_gold_result: benchmark?.olympic_gold_result || null,
        olympic_gold_age: benchmark?.olympic_gold_age || null,
        olympic_silver_result: benchmark?.olympic_silver_result || null,
        olympic_silver_age: benchmark?.olympic_silver_age || null,
        olympic_bronze_result: benchmark?.olympic_bronze_result || null,
        olympic_bronze_age: benchmark?.olympic_bronze_age || null,
        asian_games_gold_result: benchmark?.asian_games_gold_result || null,
        asian_games_gold_age: benchmark?.asian_games_gold_age || null,
        asian_games_silver_result: benchmark?.asian_games_silver_result || null,
        asian_games_silver_age: benchmark?.asian_games_silver_age || null,
        asian_games_bronze_result: benchmark?.asian_games_bronze_result || null,
        asian_games_bronze_age: benchmark?.asian_games_bronze_age || null,
        cwg_gold_result: benchmark?.cwg_gold_result || null,
        cwg_gold_age: benchmark?.cwg_gold_age || null,
        cwg_silver_result: benchmark?.cwg_silver_result || null,
        cwg_silver_age: benchmark?.cwg_silver_age || null,
        cwg_bronze_result: benchmark?.cwg_bronze_result || null,
        cwg_bronze_age: benchmark?.cwg_bronze_age || null,
        updated_by: null,
      });

      setBenchmark(updatedBenchmark);
      setIsEditingRfTarget(false);
      toast({
        title: "Success",
        description: "RF Target updated successfully",
      });
    } catch (error) {
      console.error("Error saving RF Target:", error);
      toast({
        title: "Error",
        description: "Failed to save RF Target. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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

      {/* Benchmarks Section */}
      {benchmark && (
        <div className="space-y-4">
          {/* Qualification Standards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Asian Games Qual */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-amber-400" />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Asian Games Qualification</div>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {benchmark.asian_games_qual_standard || "—"}
              </div>
              {!benchmark.asian_games_qual_standard && (
                <div className="text-xs text-muted-foreground">Not set</div>
              )}
            </div>

            {/* Commonwealth Games Qual */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-blue-400" />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Commonwealth Games Qualification</div>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {benchmark.commonwealth_games_qual_standard || "—"}
              </div>
              {!benchmark.commonwealth_games_qual_standard && (
                <div className="text-xs text-muted-foreground">Not set</div>
              )}
            </div>
          </div>

          {/* Medal Standards and RF Target */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* RF Target */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-400/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-indigo-400" />
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">RF Target</div>
                </div>
                {!isEditingRfTarget && (
                  <button
                    onClick={handleEditRfTarget}
                    className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                    title="Edit RF Target"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
              
              {isEditingRfTarget ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Target Value</label>
                    <input
                      type="text"
                      value={editedRfTarget}
                      onChange={(e) => setEditedRfTarget(e.target.value)}
                      placeholder="e.g., 10.50s, 65.00m"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Notes (optional)</label>
                    <textarea
                      value={editedRfTargetNotes}
                      onChange={(e) => setEditedRfTargetNotes(e.target.value)}
                      placeholder="Additional context or notes"
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSaveRfTarget}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Save size={14} />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-muted border border-border text-foreground rounded-lg text-sm font-medium transition-colors"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {benchmark.rf_target || "—"}
                  </div>
                  {benchmark.rf_target_notes && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {benchmark.rf_target_notes}
                    </div>
                  )}
                  {!benchmark.rf_target && (
                    <div className="text-xs text-muted-foreground">No target set</div>
                  )}
                </>
              )}
            </div>

            {/* Olympic Games Medals */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-yellow-500" />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Olympic Games Medals</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-amber-400" />
                    <div className="text-xs font-medium text-muted-foreground">Gold</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.olympic_gold_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.olympic_gold_age ? `Age: ${benchmark.olympic_gold_age}` : "No data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-gray-400" />
                    <div className="text-xs font-medium text-muted-foreground">Silver</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.olympic_silver_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.olympic_silver_age ? `Age: ${benchmark.olympic_silver_age}` : "No data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-orange-400" />
                    <div className="text-xs font-medium text-muted-foreground">Bronze</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.olympic_bronze_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.olympic_bronze_age ? `Age: ${benchmark.olympic_bronze_age}` : "No data"}
                  </div>
                </div>
              </div>
            </div>

            {/* Asian Games Medals */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-amber-500" />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Asian Games Medals</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-amber-400" />
                    <div className="text-xs font-medium text-muted-foreground">Gold</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.asian_games_gold_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.asian_games_gold_age ? `Age: ${benchmark.asian_games_gold_age}` : "No data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-gray-400" />
                    <div className="text-xs font-medium text-muted-foreground">Silver</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.asian_games_silver_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.asian_games_silver_age ? `Age: ${benchmark.asian_games_silver_age}` : "No data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-orange-400" />
                    <div className="text-xs font-medium text-muted-foreground">Bronze</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.asian_games_bronze_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.asian_games_bronze_age ? `Age: ${benchmark.asian_games_bronze_age}` : "No data"}
                  </div>
                </div>
              </div>
            </div>

            {/* Commonwealth Games Medals */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-blue-500" />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Commonwealth Games Medals</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-amber-400" />
                    <div className="text-xs font-medium text-muted-foreground">Gold</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.cwg_gold_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.cwg_gold_age ? `Age: ${benchmark.cwg_gold_age}` : "No data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-gray-400" />
                    <div className="text-xs font-medium text-muted-foreground">Silver</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.cwg_silver_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.cwg_silver_age ? `Age: ${benchmark.cwg_silver_age}` : "No data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal size={14} className="text-orange-400" />
                    <div className="text-xs font-medium text-muted-foreground">Bronze</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {benchmark.cwg_bronze_result || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {benchmark.cwg_bronze_age ? `Age: ${benchmark.cwg_bronze_age}` : "No data"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                          <a className="hover:text-indigo-400 transition-colors">
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
                      <td className="px-4 py-2.5 text-foreground">
                        {(() => {
                          const pb = personalBests.get(athlete.aa_athlete_id);
                          if (pb?.mark) {
                            return formatPerformance(pb.mark, eventName);
                          }
                          return <span className="text-muted-foreground">—</span>;
                        })()}
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
