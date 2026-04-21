import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { fetchWAAthleteProfile, fetchWAAthleteHonours, fetchWAAthletePersonalBests } from "@/lib/queries";
import { Skeleton } from "@/components/Skeleton";
import type { WAAthleteProfile, WAAthleteHonour, WAAthletePersonalBest } from "@/lib/types";
import { ArrowLeft, Calendar, Flag, User2, Trophy, Target, TrendingUp, Globe, LineChart } from "lucide-react";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [athlete, setAthlete] = useState<WAAthleteProfile | null>(null);
  const [honours, setHonours] = useState<WAAthleteHonour[]>([]);
  const [personalBests, setPersonalBests] = useState<WAAthletePersonalBest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await fetchWAAthleteProfile(id!);
      setAthlete(profile);
      
      // Try to fetch personal bests, but don't fail if it doesn't work
      try {
        const athletePBs = await fetchWAAthletePersonalBests(id!);
        setPersonalBests(athletePBs);
      } catch (pbError) {
        console.warn("Could not fetch athlete personal bests:", pbError);
        setPersonalBests([]);
      }
      
      // Try to fetch honours, but don't fail if it doesn't work
      try {
        const athleteHonours = await fetchWAAthleteHonours(id!);
        setHonours(athleteHonours);
      } catch (honoursError) {
        console.warn("Could not fetch athlete honours:", honoursError);
        setHonours([]);
      }
    } catch (error) {
      console.error("Error loading athlete:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !athlete) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const events = athlete.reliance_events 
    ? athlete.reliance_events.split(',').map(e => e.trim())
    : [];

  // Normalize function to handle format differences (e.g., "110m" vs "110 Metres")
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/men's\s*/gi, '')  // Remove "Men's"
      .replace(/women's\s*/gi, '') // Remove "Women's"
      .replace(/\s*metres?\s*/gi, 'm')  // Convert "Metres"/"Metre" to "m"
      .replace(/\s+/g, '')  // Remove spaces
      .trim();
  };

  // Filter personal bests to only show disciplines that match the athlete's events
  const filteredPersonalBests = personalBests.filter(pb => {
    if (!pb.discipline) return false;
    const normalizedDiscipline = normalize(pb.discipline);
    
    // Check if the discipline matches any of the athlete's events
    return events.some(event => {
      const normalizedEvent = normalize(event);
      return normalizedDiscipline.includes(normalizedEvent) || 
             normalizedEvent.includes(normalizedDiscipline);
    });
  });

  // Filter honours to only show disciplines that match the athlete's events
  const filteredHonours = honours.filter(honour => {
    if (!honour.discipline) return false;
    const normalizedDiscipline = normalize(honour.discipline);
    
    return events.some(event => {
      const normalizedEvent = normalize(event);
      return normalizedDiscipline.includes(normalizedEvent) || 
             normalizedEvent.includes(normalizedDiscipline);
    });
  });

  // Prepare chart data from filtered honours
  const chartData = filteredHonours
    .filter(h => h.date && h.mark && h.discipline)
    .map(h => ({
      date: h.date!,
      mark: parseFloat(h.mark!.replace(/[^0-9.]/g, '')),
      discipline: h.discipline!,
      fullDate: new Date(h.date!).getTime()
    }))
    .filter(d => !isNaN(d.mark) && !isNaN(d.fullDate))
    .sort((a, b) => a.fullDate - b.fullDate);

  // Group by discipline for multiple line series
  const disciplineColors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
  const uniqueDisciplines = Array.from(new Set(chartData.map(d => d.discipline)));
  
  // Calculate Y-axis domain (min - 2 to max + 2)
  const marks = chartData.map(d => d.mark);
  const minMark = marks.length > 0 ? Math.min(...marks) : 0;
  const maxMark = marks.length > 0 ? Math.max(...marks) : 0;
  const yAxisDomain = [Math.max(0, minMark - 2), maxMark + 2];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/athletes")} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{athlete.reliance_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Athlete ID: {athlete.aa_athlete_id}
          </p>
        </div>
      </div>

      {/* Athlete Info Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Athlete Information</div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <User2 size={12} />
              Name
            </div>
            <div className="text-lg font-semibold text-foreground">{athlete.reliance_name || "—"}</div>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Calendar size={12} />
              Age
            </div>
            <div className="text-lg font-semibold text-foreground">{athlete.age ?? "—"}</div>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Gender</div>
            <div className="text-lg font-semibold text-foreground">
              {athlete.gender === "M" ? "Male" : athlete.gender === "F" ? "Female" : athlete.gender || "—"}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Flag size={12} />
              Nationality
            </div>
            <div className="text-lg font-semibold text-foreground">{athlete.nationality || "—"}</div>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Birth Date</div>
            <div className="text-lg font-semibold text-foreground">
              {athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : "—"}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <TrendingUp size={12} />
              National Ranking
            </div>
            <div className="text-lg font-semibold text-foreground">—</div>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Globe size={12} />
              World Ranking
            </div>
            <div className="text-lg font-semibold text-foreground">—</div>
          </div>
        </div>
      </div>

      {/* Events Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Events
        </div>
        
        {events.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {events.map((event, idx) => (
              <div 
                key={idx}
                className="px-4 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-medium"
              >
                {event}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No events recorded</p>
        )}
      </div>

      {/* Personal Bests Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <Target size={12} />
          Personal Bests
        </div>
        
        {filteredPersonalBests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Discipline</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Mark</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Wind</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Venue</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonalBests.map((pb) => (
                  <tr key={pb.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-sm font-semibold text-foreground">{pb.discipline || "—"}</td>
                    <td className="py-3 px-2 text-sm">
                      <span className="font-mono font-bold text-emerald-400">
                        {pb.mark || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{pb.wind || "—"}</td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{pb.venue || "—"}</td>
                    <td className="py-3 px-2 text-sm text-foreground">{pb.date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No personal bests recorded</p>
        )}
      </div>

      {/* Honours/Performance Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <Trophy size={12} />
          Performance Honours
        </div>
        
        {filteredHonours.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Competition</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Discipline</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Place</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Mark</th>
                </tr>
              </thead>
              <tbody>
                {filteredHonours.map((honour) => (
                  <tr key={honour.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-sm font-medium text-foreground">
                      {honour.date || "—"}
                    </td>
                    <td className="py-3 px-2 text-sm text-foreground">{honour.category_name || "—"}</td>
                    <td className="py-3 px-2 text-sm text-foreground">{honour.competition || "—"}</td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{honour.discipline || "—"}</td>
                    <td className="py-3 px-2 text-sm">
                      {honour.place ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          honour.place === "1." || honour.place.toLowerCase().includes("gold") || honour.place.toLowerCase().includes("1st")
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : honour.place === "2." || honour.place.toLowerCase().includes("silver") || honour.place.toLowerCase().includes("2nd")
                            ? "bg-gray-400/20 text-gray-300 border border-gray-400/30"
                            : honour.place === "3." || honour.place.toLowerCase().includes("bronze") || honour.place.toLowerCase().includes("3rd")
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}>
                          {honour.place}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-2 text-sm font-mono text-foreground">{honour.mark || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No performance honours recorded</p>
        )}
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
            <LineChart size={12} />
            Performance Progression
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  domain={yAxisDomain}
                  label={{ value: 'Mark (seconds)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Legend />
                {uniqueDisciplines.map((discipline, idx) => (
                  <Line
                    key={discipline}
                    type="monotone"
                    dataKey="mark"
                    data={chartData.filter(d => d.discipline === discipline)}
                    name={discipline}
                    stroke={disciplineColors[idx % disciplineColors.length]}
                    strokeWidth={2}
                    dot={{ fill: disciplineColors[idx % disciplineColors.length], r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Additional Info */}
      {athlete.scraped_at && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Data Information
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(athlete.scraped_at).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      )}
    </div>
  );
}
