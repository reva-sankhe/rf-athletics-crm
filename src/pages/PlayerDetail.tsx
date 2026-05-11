import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  fetchWAAthleteProfile,
  fetchWAAthleteHonours,
  fetchWAAthletePersonalBests,
  fetchAthleteEvents,
  fetchPersonalBestsForAthleteEvents,
  fetchAthleteRankings,
  fetchWARFAthleteResults,
  fetchWAToplists,
} from "@/lib/queries";
import { AthleteTrendCard } from "@/components/analytics/AthleteTrendCard";
import { Skeleton } from "@/components/Skeleton";
import type {
  WAAthleteProfile,
  WAAthleteHonour,
  WAAthletePersonalBest,
  AthleteEvent,
  PersonalBestWithEvent,
  WARanking,
  WARFAthleteResult,
  WAToplist,
} from "@/lib/types";
import {
  ArrowLeft, Calendar, Flag, User2, Trophy, Target,
  TrendingUp, Globe, LineChart, X, Download, Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  CartesianGrid, Line, LineChart as RechartsLineChart,
  XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { pdf } from "@react-pdf/renderer";
import { AthleteReportPDF } from "@/components/AthleteReportPDF";

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [selectedEventFilters, setSelectedEventFilters] = useState<Set<string>>(new Set());
  const [trendDiscipline, setTrendDiscipline] = useState<string>("");
  const [downloadingReport, setDownloadingReport] = useState(false);

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

  // Fetch toplists for key competitors in the PDF report
  const { data: toplists = [] } = useQuery<WAToplist[]>({
    queryKey: ["toplists-for-athlete", athlete?.reliance_events, athlete?.gender],
    queryFn: async () => {
      if (!athlete?.reliance_events) return [];
      const evs = athlete.reliance_events.split(",").map(e => e.trim()).filter(Boolean);
      const gender = athlete.gender === "M" ? "M" : athlete.gender === "F" ? "W" : undefined;
      const results = await Promise.all(
        evs.map(ev => fetchWAToplists(ev, gender, 50))
      );
      return results.flat();
    },
    enabled: !!athlete,
  });

  const competitionResults = rawResults
    .filter(r => !r.not_legal)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const loading = profileLoading || resultsLoading;

  // ── Download Report handler ────────────────────────────────────────────────
  const handleDownloadReport = async () => {
    if (!athlete) return;
    setDownloadingReport(true);
    try {
      const blob = await pdf(
        <AthleteReportPDF
          athlete={athlete}
          rankings={rankings}
          personalBests={personalBests}
          honours={honours}
          results={rawResults}
          toplists={toplists}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (athlete.reliance_name || "athlete").replace(/\s+/g, "_");
      a.href = url;
      a.download = `${safeName}_Report_${new Date().toISOString().slice(0, 7)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading || !athlete) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const events = athlete.reliance_events
    ? athlete.reliance_events.split(",").map(e => e.trim())
    : [];

  // Normalize event names for matching
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/men's\s*/gi, "")
      .replace(/women's\s*/gi, "")
      .replace(/\s*metres?\s*/gi, "m")
      .replace(/\s+/g, "")
      .trim();

  const isRelatedEvent = (discipline: string, athleteEvs: string[]) => {
    if (!discipline) return false;
    const nd = normalize(discipline);
    const hasMatch = athleteEvs.some(ev => {
      const ne = normalize(ev);
      return nd.includes(ne) || ne.includes(nd);
    });
    if (hasMatch) return true;
    if (nd.includes("hurdles")) return athleteEvs.some(e => normalize(e).includes("hurdles"));
    const sprint = /^(100|200|400)m$/;
    if (sprint.test(nd)) return athleteEvs.some(e => sprint.test(normalize(e)));
    const mid = /^(800|1500)m$/;
    if (mid.test(nd)) return athleteEvs.some(e => mid.test(normalize(e)));
    return false;
  };

  const getTimeSincePB = (dateString: string | null): string => {
    if (!dateString) return "—";
    try {
      const pbDate = new Date(dateString);
      const now = new Date();
      let years = now.getFullYear() - pbDate.getFullYear();
      let months = now.getMonth() - pbDate.getMonth();
      if (months < 0) { years--; months += 12; }
      if (years === 0 && months === 0) return "This month";
      if (years === 0) return `${months} ${months === 1 ? "month" : "months"}`;
      if (months === 0) return `${years} ${years === 1 ? "year" : "years"}`;
      return `${years} ${years === 1 ? "year" : "years"}, ${months} ${months === 1 ? "month" : "months"}`;
    } catch { return "—"; }
  };

  const isStrictEventMatch = (discipline: string, selectedEvents: Set<string>) => {
    if (selectedEvents.size === 0) return true;
    const nd = normalize(discipline);
    return Array.from(selectedEvents).some(ev => nd === normalize(ev));
  };

  const toggleEventFilter = (eventName: string) => {
    setSelectedEventFilters(prev => {
      const next = new Set(prev);
      if (next.has(eventName)) next.delete(eventName);
      else next.add(eventName);
      return next;
    });
  };

  const clearEventFilters = () => setSelectedEventFilters(new Set());

  const filteredPersonalBests = personalBests
    .filter(pb => pb.discipline && isRelatedEvent(pb.discipline, events))
    .filter(pb => isStrictEventMatch(pb.discipline || "", selectedEventFilters))
    .sort((a, b) => {
      const mainNames = athleteEvents.filter(ae => ae.is_main_event).map(ae => ae.event_name.toLowerCase().trim());
      const aIsMain = mainNames.some(mn => a.discipline && isRelatedEvent(a.discipline, [mn]));
      const bIsMain = mainNames.some(mn => b.discipline && isRelatedEvent(b.discipline, [mn]));
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      return 0;
    });

  const filteredHonours = honours
    .filter(h => h.discipline && isRelatedEvent(h.discipline, events))
    .filter(h => isStrictEventMatch(h.discipline || "", selectedEventFilters));

  const chartDataByYear = filteredHonours
    .filter(h => h.date && h.mark && h.discipline)
    .map(h => ({
      year: new Date(h.date!).getFullYear().toString(),
      mark: parseFloat(h.mark!.replace(/[^0-9.]/g, "")),
      discipline: h.discipline!,
      fullDate: new Date(h.date!).getTime(),
    }))
    .filter(d => !isNaN(d.mark) && !isNaN(d.fullDate))
    .reduce((acc, curr) => {
      const key = `${curr.year}-${curr.discipline}`;
      if (!acc[key] || curr.mark < acc[key].mark) acc[key] = curr;
      return acc;
    }, {} as Record<string, { year: string; mark: number; discipline: string; fullDate: number }>);

  const chartData = Object.values(chartDataByYear).sort((a, b) => parseInt(a.year) - parseInt(b.year));
  const disciplineColors = ["#00A651", "#D8B365", "#f59e0b", "#ef4444", "#3b82f6"];
  const uniqueDisciplines = Array.from(new Set(chartData.map(d => d.discipline)));
  const marks = chartData.map(d => d.mark);
  const minMark = marks.length > 0 ? Math.min(...marks) : 0;
  const maxMark = marks.length > 0 ? Math.max(...marks) : 0;
  const yAxisDomain = [Math.max(0, minMark - 2), maxMark + 2];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/athletes")}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {athlete.reliance_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Athlete ID: {athlete.aa_athlete_id}
          </p>
        </div>
        {/* Download Report button */}
        <button
          onClick={handleDownloadReport}
          disabled={downloadingReport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
        >
          {downloadingReport ? (
            <><Loader2 size={15} className="animate-spin" /> Generating…</>
          ) : (
            <><Download size={15} /> Download Report</>
          )}
        </button>
      </div>

      {/* Athlete Info Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Athlete Information
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <User2 size={12} /> Name
            </div>
            <div className="text-lg font-semibold text-foreground">{athlete.reliance_name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Calendar size={12} /> Age
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
              <Flag size={12} /> Nationality
            </div>
            <div className="text-lg font-semibold text-foreground">{athlete.nationality || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Birth Date</div>
            <div className="text-lg font-semibold text-foreground">
              {athlete.birth_date ? format(parseISO(athlete.birth_date), "MMMM d, yyyy") : "—"}
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Globe size={12} /> Current Rankings
            </div>
            <div className="text-lg font-semibold text-foreground">
              {rankings.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {rankings.map((ranking, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground font-normal">
                        {ranking.event_group.replace("/", " - ").replace("-", " ")}:
                      </span>
                      <span className="font-bold text-indigo-400">#{ranking.rank}</span>
                      <span className="text-xs text-muted-foreground">({ranking.ranking_score} pts)</span>
                    </span>
                  ))}
                </div>
              ) : "—"}
            </div>
          </div>
          <div className="sm:col-span-2 lg:grid-cols-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Target size={12} /> Events
              {selectedEventFilters.size > 0 && events.length > 1 && (
                <span className="text-[10px] text-amber-400 ml-2">
                  ({selectedEventFilters.size} selected - filtering data below)
                </span>
              )}
            </div>
            {(events.length > 0 || athleteEvents.length > 0) ? (
              <div className="space-y-3">
                {selectedEventFilters.size > 0 && events.length > 1 && (
                  <button
                    onClick={clearEventFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 transition-colors"
                  >
                    <X size={12} /> Show All Events
                  </button>
                )}
                <div className="flex flex-wrap items-start gap-6">
                  {athleteEvents.filter(ae => ae.is_main_event).length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-emerald-400 mb-1.5">Main Event</div>
                      <div className="flex flex-wrap gap-2">
                        {athleteEvents.filter(ae => ae.is_main_event).map((ae, idx) => {
                          const isSelected = selectedEventFilters.has(ae.event_name);
                          const hasActiveFilters = selectedEventFilters.size > 0;
                          const isClickable = events.length > 1;
                          return (
                            <button
                              key={idx}
                              onClick={() => isClickable && toggleEventFilter(ae.event_name)}
                              disabled={!isClickable}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"} ${
                                isSelected
                                  ? "bg-emerald-500/40 border-2 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/50"
                                  : hasActiveFilters && !isSelected
                                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400/50"
                                  : "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                              }`}
                            >
                              {ae.event_name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const mainEventNames = athleteEvents.filter(ae => ae.is_main_event).map(ae => ae.event_name.toLowerCase().trim());
                    const otherEvents = events.filter(ev => !mainEventNames.includes(ev.toLowerCase().trim()));
                    return otherEvents.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-indigo-400 mb-1.5">Other Events</div>
                        <div className="flex flex-wrap gap-2">
                          {otherEvents.map((event, idx) => {
                            const isSelected = selectedEventFilters.has(event);
                            const hasActiveFilters = selectedEventFilters.size > 0;
                            const isClickable = events.length > 1;
                            return (
                              <button
                                key={idx}
                                onClick={() => isClickable && toggleEventFilter(event)}
                                disabled={!isClickable}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"} ${
                                  isSelected
                                    ? "bg-indigo-500/40 border-2 border-indigo-400 text-indigo-200 shadow-lg shadow-indigo-500/50"
                                    : hasActiveFilters && !isSelected
                                    ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400/50"
                                    : "bg-indigo-500/15 border border-indigo-500/30 text-indigo-400"
                                }`}
                              >
                                {event}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-lg font-semibold text-foreground">—</div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      {(() => {
        const trendDisciplines = Array.from(new Set(competitionResults.map(r => r.discipline).filter(Boolean))).sort();
        if (trendDisciplines.length === 0) return null;
        const activeDiscipline = trendDiscipline || trendDisciplines[0];
        return (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <TrendingUp size={12} /> Performance Trends
              </div>
              {trendDisciplines.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {trendDisciplines.map(disc => (
                    <button
                      key={disc}
                      onClick={() => setTrendDiscipline(disc)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        disc === activeDiscipline ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {disc}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <AthleteTrendCard
              athleteName={athlete.reliance_name || athlete.aa_athlete_id}
              results={competitionResults}
              discipline={activeDiscipline}
            />
          </div>
        );
      })()}

      {/* Personal Bests */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <Target size={12} /> Personal Bests
        </div>
        {selectedEventFilters.size > 0 && (
          <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="text-xs text-amber-300 font-medium">
              Showing data for: {Array.from(selectedEventFilters).join(", ")}
            </div>
          </div>
        )}
        {filteredPersonalBests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Discipline</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Mark</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Venue</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Time Since PB</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonalBests.map(pb => (
                  <tr key={pb.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-sm font-semibold text-foreground">{pb.discipline || "—"}</td>
                    <td className="py-3 px-2 text-sm">
                      <span className="font-mono font-bold text-foreground">{pb.mark || "—"}</span>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{pb.venue || "—"}</td>
                    <td className="py-3 px-2 text-sm text-foreground">{pb.date || "—"}</td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{getTimeSincePB(pb.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No personal bests recorded</p>
        )}
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
            <LineChart size={12} /> Season Bests
          </div>
          {selectedEventFilters.size > 0 && (
            <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="text-xs text-amber-300 font-medium">
                Showing data for: {Array.from(selectedEventFilters).join(", ")}
              </div>
            </div>
          )}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} domain={yAxisDomain}
                  label={{ value: "Mark (seconds)", angle: -90, position: "insideLeft", style: { fill: "#9ca3af" } }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Legend />
                {uniqueDisciplines.map((discipline, idx) => (
                  <Line key={discipline} type="monotone" dataKey="mark"
                    data={chartData.filter(d => d.discipline === discipline)}
                    name={discipline} stroke={disciplineColors[idx % disciplineColors.length]}
                    strokeWidth={2} dot={{ fill: disciplineColors[idx % disciplineColors.length], r: 4 }}
                    activeDot={{ r: 6 }} />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance History */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <Trophy size={12} /> Performance History
        </div>
        {filteredHonours.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Competition</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Event</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Place</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground">Mark</th>
                </tr>
              </thead>
              <tbody>
                {filteredHonours.map(honour => (
                  <tr key={honour.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-sm font-medium text-foreground">{honour.date || "—"}</td>
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

      {/* Competition History */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
          <TrendingUp size={12} /> Competition History
        </div>
        {competitionResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Competition</th>
                  <th className="text-left py-3 px-2">Discipline</th>
                  <th className="text-right py-3 px-2">Mark</th>
                  <th className="text-right py-3 px-2">Score</th>
                  <th className="text-center py-3 px-2">Place</th>
                </tr>
              </thead>
              <tbody>
                {competitionResults.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-2 max-w-[200px] truncate text-foreground">{r.competition}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded border border-border text-xs text-muted-foreground">
                        {r.discipline}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-foreground">{r.mark}</td>
                    <td className="py-3 px-2 text-right font-semibold text-foreground">{r.result_score}</td>
                    <td className="py-3 px-2 text-center text-muted-foreground">{r.place || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No competition results recorded</p>
        )}
      </div>

      {/* Data Info */}
      {athlete.scraped_at && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Data Information
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {format(parseISO(athlete.scraped_at), "MMMM d, yyyy, h:mm a")}
          </div>
        </div>
      )}
    </div>
  );
}
