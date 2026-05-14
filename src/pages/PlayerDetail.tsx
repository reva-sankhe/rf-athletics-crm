import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWAAthleteProfile, fetchWAAthleteHonours, fetchWAAthletePersonalBests, fetchAthleteEvents, fetchPersonalBestsForAthleteEvents, fetchAthleteRankings, fetchRankingsByEventGroups, fetchWARFAthleteResults, uploadAthletePhoto, deleteAthletePhoto } from "@/lib/queries";
import { AthleteTrendCard } from "@/components/analytics/AthleteTrendCard";
import { Skeleton } from "@/components/Skeleton";
import type { WAAthleteProfile, WAAthleteHonour, WAAthletePersonalBest, AthleteEvent, PersonalBestWithEvent, WARanking, WARFAthleteResult } from "@/lib/types";
import { isEventMatch, classifyEvent } from "@/lib/eventUtils";
import { ArrowLeft, Calendar, Flag, User2, Trophy, Target, TrendingUp, Globe, LineChart, Upload, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

function stripGender(s: string | null | undefined): string {
  if (!s) return "—";
  return s.replace(/^(Women's|Men's)\s+/i, "");
}

function parseMarkNumeric(mark: string, isTimeBased: boolean): number {
  const clean = mark.replace(/[^0-9.:]/g, "");
  if (!isTimeBased) return parseFloat(clean);
  const parts = clean.split(":");
  if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(parts[0]);
}

function PlaceBadge({ place }: { place: string }) {
  const p = place.toLowerCase();
  const isGold   = place === "1" || place === "1." || p.includes("gold")   || p.includes("1st");
  const isSilver = place === "2" || place === "2." || p.includes("silver") || p.includes("2nd");
  const isBronze = place === "3" || place === "3." || p.includes("bronze") || p.includes("3rd");
  const cls = isGold
    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : isSilver
    ? "bg-gray-400/20 text-gray-300 border-gray-400/30"
    : isBronze
    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {place}
    </span>
  );
}

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trendDiscipline, setTrendDiscipline] = useState<string>("");
  const [photoUploading, setPhotoUploading] = useState(false);

  const { data: athlete, isLoading: profileLoading } = useQuery<WAAthleteProfile | null>({
    queryKey: ["athlete", id],
    queryFn: () => fetchWAAthleteProfile(id!),
    enabled: !!id,
  });
  const { data: rankings = [] } = useQuery<WARanking[]>({
    queryKey: ["athlete-rankings", athlete?.reliance_name],
    queryFn: () => fetchAthleteRankings(athlete!.reliance_name!),
    enabled: !!athlete?.reliance_name,
  });
  const { data: indiaRankings = [] } = useQuery<WARanking[]>({
    queryKey: ["india-rankings", rankings.map(r => r.event_group).join(",")],
    queryFn: () => fetchRankingsByEventGroups(rankings.map(r => r.event_group), "IND"),
    enabled: rankings.length > 0,
  });
  const { data: athleteEvents = [] } = useQuery<AthleteEvent[]>({
    queryKey: ["athlete-events", id],
    queryFn: () => fetchAthleteEvents(id!),
    enabled: !!id,
  });
  const { data: matchedPersonalBests = [] } = useQuery<PersonalBestWithEvent[]>({
    queryKey: ["athlete-pbs-matched", id],
    queryFn: () => fetchPersonalBestsForAthleteEvents(id!),
    enabled: !!id,
  });
  const { data: personalBests = [] } = useQuery<WAAthletePersonalBest[]>({
    queryKey: ["athlete-pbs", id],
    queryFn: () => fetchWAAthletePersonalBests(id!),
    enabled: !!id,
  });
  const { data: honours = [] } = useQuery<WAAthleteHonour[]>({
    queryKey: ["athlete-honours", id],
    queryFn: () => fetchWAAthleteHonours(id!),
    enabled: !!id,
  });
  const { data: rawResults = [], isLoading: resultsLoading } = useQuery<WARFAthleteResult[]>({
    queryKey: ["athlete-rf-results", id],
    queryFn: () => fetchWARFAthleteResults(id!, 200),
    enabled: !!id,
  });

  const competitionResults = rawResults
    .filter(r => !r.not_legal)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const loading = profileLoading || resultsLoading;

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

  // Enhanced matching for related events
  const isRelatedEvent = (discipline: string, athleteEvents: string[]) => {
    if (!discipline) return false;
    const normalizedDiscipline = normalize(discipline);
    
    // Check for exact or partial matches, but never cross relay/non-relay boundary
    const disciplineIsRelay = normalizedDiscipline.includes('relay');
    const hasMatch = athleteEvents.some(event => {
      const normalizedEvent = normalize(event);
      if (disciplineIsRelay !== normalizedEvent.includes('relay')) return false;
      return normalizedDiscipline.includes(normalizedEvent) ||
             normalizedEvent.includes(normalizedDiscipline);
    });
    
    if (hasMatch) return true;
    
    // Special case: treat hurdles events as related regardless of distance
    // (e.g., 110m Hurdles and 60m Hurdles are related)
    if (normalizedDiscipline.includes('hurdles')) {
      return athleteEvents.some(e => normalize(e).includes('hurdles'));
    }
    
    // Special case: treat sprint distances as related (100m, 200m, 400m)
    const sprintPattern = /^(100|200|400)m$/;
    if (sprintPattern.test(normalizedDiscipline)) {
      return athleteEvents.some(e => sprintPattern.test(normalize(e)));
    }
    
    // Special case: treat middle distance events as related (800m, 1500m)
    const middleDistancePattern = /^(800|1500)m$/;
    if (middleDistancePattern.test(normalizedDiscipline)) {
      return athleteEvents.some(e => middleDistancePattern.test(normalize(e)));
    }
    
    return false;
  };

  // Helper function to calculate time since PB
  const getTimeSincePB = (dateString: string | null): string => {
    if (!dateString) return "—";
    
    try {
      const pbDate = new Date(dateString);
      const now = new Date();
      
      // Calculate difference in months
      let years = now.getFullYear() - pbDate.getFullYear();
      let months = now.getMonth() - pbDate.getMonth();
      
      if (months < 0) {
        years--;
        months += 12;
      }
      
      // Format output
      if (years === 0 && months === 0) {
        return "This month";
      } else if (years === 0) {
        return `${months} ${months === 1 ? 'month' : 'months'}`;
      } else if (months === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      } else {
        return `${years} ${years === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'}`;
      }
    } catch (error) {
      return "—";
    }
  };

  // Photo handlers
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !athlete) return;
    setPhotoUploading(true);
    try {
      await uploadAthletePhoto(athlete.aa_athlete_id, file);
      queryClient.invalidateQueries({ queryKey: ["athlete", id] });
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePhotoDelete() {
    if (!athlete?.photo_url) return;
    setPhotoUploading(true);
    try {
      await deleteAthletePhoto(athlete.aa_athlete_id, athlete.photo_url);
      queryClient.invalidateQueries({ queryKey: ["athlete", id] });
    } finally {
      setPhotoUploading(false);
    }
  }

  // Discipline tabs — sorted: main event first, then alphabetical
  const trendDisciplines = Array.from(
    new Set(competitionResults.map(r => r.discipline).filter(Boolean))
  ) as string[];

  const mainAthleteEvent = athleteEvents.find(ae => ae.is_main_event)?.event_name ?? "";
  const mainEventDiscipline = mainAthleteEvent
    ? trendDisciplines.find(d => isEventMatch(d, mainAthleteEvent)) ?? ""
    : "";

  trendDisciplines.sort((a, b) => {
    if (a === mainEventDiscipline) return -1;
    if (b === mainEventDiscipline) return 1;
    return a.localeCompare(b);
  });

  // Fall back to the main event tab when nothing is explicitly selected
  const effectiveDiscipline = trendDiscipline || (trendDisciplines.length > 0 ? trendDisciplines[0] : "");

  // Filter all sections by the effective discipline (main event by default)
  const disciplineFilter = effectiveDiscipline
    ? (d: string | null) => !!d && isEventMatch(d, effectiveDiscipline)
    : () => true;

  const filteredCompetitionResults = competitionResults.filter(r => disciplineFilter(r.discipline));

  // Filter personal bests to disciplines that match the athlete's events, then apply trend filter
  const filteredPersonalBests = personalBests
    .filter(pb => pb.discipline && isRelatedEvent(pb.discipline, events))
    .filter(pb => disciplineFilter(pb.discipline))
    .sort((a, b) => {
      const mainEventNames = athleteEvents
        .filter(ae => ae.is_main_event)
        .map(ae => ae.event_name.toLowerCase().trim());
      const aIsMain = mainEventNames.some(mainEvent => a.discipline && isRelatedEvent(a.discipline, [mainEvent]));
      const bIsMain = mainEventNames.some(mainEvent => b.discipline && isRelatedEvent(b.discipline, [mainEvent]));
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      return 0;
    });

  // Filter honours to disciplines that match the athlete's events, then apply trend filter
  const filteredHonours = honours
    .filter(honour => honour.discipline && isRelatedEvent(honour.discipline, events))
    .filter(honour => disciplineFilter(honour.discipline));


  // Best result per year per discipline from competition history — drives both the table and the chart
  type SeasonBestRow = { year: number; date: string; discipline: string; mark: string; numericMark: number; competition: string; wind: string | null; place: string };
  const seasonBestsByYear = Object.values(
    competitionResults
      .filter(r => r.discipline && r.mark && isRelatedEvent(r.discipline, events) && disciplineFilter(r.discipline))
      .reduce((acc, r) => {
        const year = new Date(r.date).getFullYear();
        const isTime = classifyEvent(r.discipline)?.direction === "lower_better";
        const numericMark = parseMarkNumeric(r.mark, isTime ?? false);
        if (isNaN(numericMark)) return acc;
        const key = `${year}-${r.discipline}`;
        const isBetter = !acc[key] || (isTime ? numericMark < acc[key].numericMark : numericMark > acc[key].numericMark);
        if (isBetter) acc[key] = { year, date: r.date, discipline: r.discipline, mark: r.mark, numericMark, competition: r.competition, wind: r.wind ?? null, place: r.place ?? "" };
        return acc;
      }, {} as Record<string, SeasonBestRow>)
  ).sort((a, b) => b.year - a.year || a.discipline.localeCompare(b.discipline));

  const chartData = [...seasonBestsByYear].sort((a, b) => a.year - b.year).map(d => ({ year: String(d.year), mark: d.numericMark, discipline: d.discipline }));

  // Group by discipline for multiple line series
  const disciplineColors = ['#00A651', '#D8B365', '#f59e0b', '#ef4444', '#3b82f6'];
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
      </div>

      {/* Athlete Info Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

        {/* Top row: photo | name + badges | rankings */}
        <div className="flex gap-5 mb-5">

          {/* Photo */}
          <div className="relative group shrink-0 w-[88px] h-[88px]">
            {athlete.photo_url ? (
              <img src={athlete.photo_url} alt={athlete.reliance_name} className="w-full h-full rounded-2xl object-cover border border-border" />
            ) : (
              <div className="w-full h-full rounded-2xl border border-border bg-muted flex items-center justify-center">
                <User2 size={36} className="text-muted-foreground" />
              </div>
            )}
            <div className={`absolute inset-0 rounded-2xl bg-black/55 flex items-center justify-center gap-2 transition-opacity ${photoUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              {photoUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors" title="Upload photo">
                    <Upload size={13} />
                  </button>
                  {athlete.photo_url && (
                    <button onClick={handlePhotoDelete} className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/70 text-white transition-colors" title="Delete photo">
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Name + quick-fact badges */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-foreground leading-tight truncate">{athlete.reliance_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {athlete.nationality && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted border border-border px-2 py-1 rounded-md text-foreground">
                  <Flag size={10} className="text-muted-foreground" /> {athlete.nationality}
                </span>
              )}
              {athlete.gender && (
                <span className="inline-flex items-center text-xs font-medium bg-muted border border-border px-2 py-1 rounded-md text-foreground">
                  {athlete.gender === "M" ? "Male" : athlete.gender === "F" ? "Female" : athlete.gender}
                </span>
              )}
              {athlete.age != null && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted border border-border px-2 py-1 rounded-md text-foreground">
                  <Calendar size={10} className="text-muted-foreground" /> Age {athlete.age}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {athlete.birth_date && <>Born {format(parseISO(athlete.birth_date), 'MMMM d, yyyy')} · </>}
              ID: {athlete.aa_athlete_id}
            </p>
          </div>

          {/* Rankings — top right, big numbers */}
          {rankings.length > 0 && (
            <div className="shrink-0 flex gap-5 items-start">
              {rankings.map((ranking, idx) => {
                const eventIndia = indiaRankings
                  .filter(r => r.event_group === ranking.event_group)
                  .sort((a, b) => a.rank - b.rank);
                const indiaRankIdx = eventIndia.findIndex(
                  r => r.athlete_name.toLowerCase() === ranking.athlete_name.toLowerCase()
                );
                const indiaRank = indiaRankIdx >= 0 ? indiaRankIdx + 1 : null;
                return (
                  <div key={idx} className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      {ranking.event_group.replace('/', ' / ')}
                    </p>
                    <div className="flex gap-4 items-start justify-end">
                      <div>
                        <p className="text-2xl font-bold text-indigo-400 leading-none">#{ranking.rank}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">World</p>
                        <p className="text-[10px] text-muted-foreground">{ranking.ranking_score} pts</p>
                      </div>
                      {indiaRank !== null && (
                        <div>
                          <p className="text-2xl font-bold text-amber-400 leading-none">#{indiaRank}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">India</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Bottom row: events */}
        {(events.length > 0 || athleteEvents.length > 0) && (
          <div className="pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Events</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
              {(() => {
                const mainNames = new Set(athleteEvents.filter(ae => ae.is_main_event).map(ae => ae.event_name.toLowerCase().trim()));
                const allEvents = [
                  ...athleteEvents.filter(ae => ae.is_main_event).map(ae => ({ name: ae.event_name, isMain: true })),
                  ...events.filter(e => !mainNames.has(e.toLowerCase().trim())).map(e => ({ name: e, isMain: false })),
                ];
                return allEvents.map((ev, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <span className="text-border select-none">|</span>}
                    {ev.isMain && <span className="text-amber-400 text-xs">★</span>}
                    <span className={ev.isMain ? "font-medium text-foreground" : "text-muted-foreground"}>
                      {ev.name}
                    </span>
                  </span>
                ));
              })()}
            </div>
          </div>
        )}

      </div>

      {/* Performance Trends — discipline tabs act as the global page filter */}
      {trendDisciplines.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <TrendingUp size={12} />
              Performance Trends
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendDisciplines.map(disc => (
                <button
                  key={disc}
                  onClick={() => setTrendDiscipline(prev => prev === disc ? "" : disc)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    disc === effectiveDiscipline
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {disc}
                </button>
              ))}
            </div>
          </div>
          <AthleteTrendCard
            athleteName={athlete.reliance_name || athlete.aa_athlete_id}
            results={filteredCompetitionResults}
            discipline={effectiveDiscipline}
          />
        </div>
      )}

      {/* Personal Bests Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <Target size={12} />
          Personal Bests
        </div>
        
        {filteredPersonalBests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Venue</th>
                  <th className="text-left py-3 px-2">Event</th>
                  <th className="text-right py-3 px-2">Mark</th>
                  <th className="text-right py-3 px-2">Wind</th>
                  <th className="text-left py-3 px-2">Time Since PB</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonalBests.map((pb) => (
                  <tr key={pb.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">{pb.date || "—"}</td>
                    <td className="py-3 px-2 text-muted-foreground">{pb.venue || "—"}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded border border-border text-xs text-muted-foreground">
                        {stripGender(pb.discipline)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-mono font-bold text-foreground">{pb.mark || "—"}</span>
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{pb.wind || "—"}</td>
                    <td className="py-3 px-2 text-muted-foreground">{getTimeSincePB(pb.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No personal bests recorded</p>
        )}
      </div>

      {/* Season Bests Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <Target size={12} />
          Season Bests
        </div>

        {seasonBestsByYear.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Competition</th>
                  <th className="text-left py-3 px-2">Event</th>
                  <th className="text-right py-3 px-2">Mark</th>
                  <th className="text-right py-3 px-2">Wind</th>
                  <th className="text-center py-3 px-2">Place</th>
                </tr>
              </thead>
              <tbody>
                {seasonBestsByYear.map((sb, i) => {
                  const pb = personalBests.find(p => p.discipline && isEventMatch(p.discipline, sb.discipline));
                  const sbIsPB = pb && pb.mark === sb.mark;
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {new Date(sb.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-2 max-w-[200px] truncate text-foreground">{sb.competition || "—"}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded border border-border text-xs text-muted-foreground">
                          {stripGender(sb.discipline)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-mono font-bold ${sbIsPB ? "text-emerald-400" : "text-foreground"}`}>
                          {sb.mark}
                        </span>
                        {sbIsPB && <span className="ml-1.5 text-[10px] text-emerald-400 font-normal">= PB</span>}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">{sb.wind || "—"}</td>
                      <td className="py-3 px-2 text-center">
                        {sb.place ? <PlaceBadge place={sb.place} /> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No season bests recorded</p>
        )}
      </div>

      {/* Season Bests Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
            <LineChart size={12} />
            Season Bests
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="year" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  domain={yAxisDomain}
                  label={{ value: 'Mark', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
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

      {/* Honours/Performance Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <Trophy size={12} />
          Performance History
        </div>

        {filteredHonours.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Competition</th>
                  <th className="text-left py-3 px-2">Category</th>
                  <th className="text-left py-3 px-2">Event</th>
                  <th className="text-right py-3 px-2">Mark</th>
                  <th className="text-center py-3 px-2">Place</th>
                </tr>
              </thead>
              <tbody>
                {filteredHonours.map((honour) => (
                  <tr key={honour.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                      {honour.date
                        ? new Date(honour.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="py-3 px-2 max-w-[200px] truncate text-foreground">{honour.competition || "—"}</td>
                    <td className="py-3 px-2 text-muted-foreground">{honour.category_name || "—"}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded border border-border text-xs text-muted-foreground">
                        {stripGender(honour.discipline)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-foreground">{honour.mark || "—"}</td>
                    <td className="py-3 px-2 text-center">
                      {honour.place ? <PlaceBadge place={honour.place} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No performance honours recorded</p>
        )}
      </div>

      {/* Competition History */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <TrendingUp size={12} />
          Competition History
        </div>

        {filteredCompetitionResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Competition</th>
                  <th className="text-left py-3 px-2">Event</th>
                  <th className="text-right py-3 px-2">Mark</th>
                  <th className="text-right py-3 px-2">Score</th>
                  <th className="text-center py-3 px-2">Place</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitionResults.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-2 max-w-[200px] truncate text-foreground">{r.competition}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded border border-border text-xs text-muted-foreground">
                        {stripGender(r.discipline)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-foreground">{r.mark}</td>
                    <td className="py-3 px-2 text-right font-semibold text-foreground">{r.result_score}</td>
                    <td className="py-3 px-2 text-center">
                      {r.place ? <PlaceBadge place={r.place} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {competitionResults.length > 0 ? "No results match the current event filter." : "No competition results recorded"}
          </p>
        )}
      </div>

      {/* Additional Info */}
      {athlete.scraped_at && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Data Information
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {format(parseISO(athlete.scraped_at), 'MMMM d, yyyy, h:mm a')}
          </div>
        </div>
      )}
    </div>
  );
}
