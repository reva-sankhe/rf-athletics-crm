import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Scatter, ScatterChart, ZAxis } from "recharts";
import { supabase } from "@/lib/supabase";

interface MedalData {
  id: string;
  aa_athlete_id: string;
  athlete_name: string;
  category_name: string;
  competition: string;
  discipline: string;
  place: string;
  mark: string;
  date: string;
  birth_date?: string;
  age_at_competition?: number;
}

export function AgeAnalysisTab() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [medalData, setMedalData] = useState<MedalData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedCompetition, setSelectedCompetition] = useState<string>("all");
  const [showRFOverlay, setShowRFOverlay] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [athletesData] = await Promise.all([
        fetchWAAthleteProfiles(),
      ]);
      setAthletes(athletesData);

      // Fetch medal data from wa_athlete_honours
      const { data: honoursData, error } = await supabase
        .from("wa_athlete_honours")
        .select("*")
        .in("place", ["1.", "2.", "3."]);

      if (error) throw error;

      // Join with athlete profiles to get birth dates
      const enrichedData = await Promise.all(
        (honoursData || []).map(async (honour) => {
          const { data: profileData } = await supabase
            .from("wa_athlete_profiles")
            .select("birth_date")
            .eq("aa_athlete_id", honour.aa_athlete_id)
            .single();

          let ageAtCompetition = null;
          if (profileData?.birth_date && honour.date) {
            const birthDate = new Date(profileData.birth_date);
            const competitionDate = new Date(honour.date);
            ageAtCompetition = competitionDate.getFullYear() - birthDate.getFullYear();
            
            // Adjust if birthday hasn't occurred yet in competition year
            if (
              competitionDate.getMonth() < birthDate.getMonth() ||
              (competitionDate.getMonth() === birthDate.getMonth() &&
                competitionDate.getDate() < birthDate.getDate())
            ) {
              ageAtCompetition--;
            }
          }

          return {
            ...honour,
            birth_date: profileData?.birth_date,
            age_at_competition: ageAtCompetition,
          };
        })
      );

      setMedalData(enrichedData.filter(d => d.age_at_competition !== null) as MedalData[]);
    } catch (error) {
      console.error("Error loading age analysis data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Get unique events and competitions
  const uniqueEvents = Array.from(new Set(medalData.map(m => m.discipline))).sort();
  const uniqueCompetitions = Array.from(new Set(medalData.map(m => m.category_name))).sort();

  // Filter medal data
  const filteredMedalData = medalData.filter(medal => {
    if (selectedEvent !== "all" && medal.discipline !== selectedEvent) return false;
    if (selectedCompetition !== "all" && medal.category_name !== selectedCompetition) return false;
    return true;
  });

  // Calculate average medal-winning age by event
  const avgAgeByEvent = uniqueEvents.map(event => {
    const eventMedals = filteredMedalData.filter(m => m.discipline === event);
    if (eventMedals.length === 0) return null;

    const avgAge = eventMedals.reduce((sum, m) => sum + (m.age_at_competition || 0), 0) / eventMedals.length;
    const goldMedals = eventMedals.filter(m => m.place === "1.");
    const avgGoldAge = goldMedals.length > 0
      ? goldMedals.reduce((sum, m) => sum + (m.age_at_competition || 0), 0) / goldMedals.length
      : null;

    return {
      event,
      avgAge: Math.round(avgAge * 10) / 10,
      avgGoldAge: avgGoldAge ? Math.round(avgGoldAge * 10) / 10 : null,
      medalCount: eventMedals.length,
      goldCount: goldMedals.length,
    };
  }).filter(Boolean);

  // Calculate age progression over years
  const ageProgressionData = filteredMedalData.reduce((acc, medal) => {
    if (!medal.date || !medal.age_at_competition) return acc;
    
    const year = new Date(medal.date).getFullYear();
    const existing = acc.find(item => item.year === year);
    
    if (existing) {
      existing.totalAge += medal.age_at_competition;
      existing.count += 1;
      existing.avgAge = Math.round((existing.totalAge / existing.count) * 10) / 10;
    } else {
      acc.push({
        year,
        totalAge: medal.age_at_competition,
        count: 1,
        avgAge: medal.age_at_competition,
      });
    }
    
    return acc;
  }, [] as Array<{ year: number; totalAge: number; count: number; avgAge: number }>);

  ageProgressionData.sort((a, b) => a.year - b.year);

  // Get RF athlete ages for overlay
  const rfAthleteAges = athletes
    .filter(a => a.age)
    .map(a => ({
      name: a.reliance_name,
      age: a.age!,
      events: a.reliance_events || "",
    }));

  // Filter RF athletes by selected event
  const filteredRFAthletes = selectedEvent !== "all"
    ? rfAthleteAges.filter(rf => rf.events.toLowerCase().includes(selectedEvent.toLowerCase()))
    : rfAthleteAges;

  const COLORS = ['#00A651', '#D8B365', '#6B7280', '#9CA3AF', '#4B5563'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
          <CardDescription>Analyze medal-winning ages across events and competitions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEvents.map(event => (
                    <SelectItem key={event} value={event}>{event}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Competition Type</Label>
              <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Competitions</SelectItem>
                  {uniqueCompetitions.map(comp => (
                    <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="rf-overlay"
              checked={showRFOverlay}
              onCheckedChange={setShowRFOverlay}
            />
            <Label htmlFor="rf-overlay">Show RF Athletes Overlay</Label>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Medal-Winning Age Insights</CardTitle>
          <CardDescription>Key statistics about age and medal performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Medals Analyzed</p>
              <p className="text-2xl font-bold">{filteredMedalData.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Average Medal Age</p>
              <p className="text-2xl font-bold">
                {filteredMedalData.length > 0
                  ? Math.round(
                      (filteredMedalData.reduce((sum, m) => sum + (m.age_at_competition || 0), 0) /
                        filteredMedalData.length) *
                        10
                    ) / 10
                  : "N/A"}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Age Range</p>
              <p className="text-2xl font-bold">
                {filteredMedalData.length > 0
                  ? `${Math.min(...filteredMedalData.map(m => m.age_at_competition!))} - ${Math.max(
                      ...filteredMedalData.map(m => m.age_at_competition!)
                    )}`
                  : "N/A"}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">RF Athletes</p>
              <p className="text-2xl font-bold">{filteredRFAthletes.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Medal-Winning Age by Event */}
      <Card>
        <CardHeader>
          <CardTitle>Average Medal-Winning Age by Event</CardTitle>
          <CardDescription>
            Average age of athletes winning medals in each event (Gold medals highlighted)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : avgAgeByEvent.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No medal data available for selected filters</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={avgAgeByEvent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="event" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Average Age', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.event}</p>
                          <p className="text-sm">Avg Age (All): {data.avgAge} years</p>
                          {data.avgGoldAge && (
                            <p className="text-sm">Avg Age (Gold): {data.avgGoldAge} years</p>
                          )}
                          <p className="text-sm">Total Medals: {data.medalCount}</p>
                          <p className="text-sm">Gold Medals: {data.goldCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="avgAge" fill="#9CA3AF" name="Avg Age (All Medals)" />
                <Bar dataKey="avgGoldAge" fill="#00A651" name="Avg Age (Gold Medals)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Age Progression Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Medal-Winning Age Progression Over Time</CardTitle>
          <CardDescription>
            How the average age of medal winners has changed over the years
            {showRFOverlay && " (RF athletes shown as points)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : ageProgressionData.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No progression data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={ageProgressionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Average Age', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">Year: {data.year}</p>
                          <p className="text-sm">Avg Age: {data.avgAge} years</p>
                          <p className="text-sm">Medals: {data.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgAge"
                  stroke="#00A651"
                  strokeWidth={2}
                  name="Avg Medal-Winning Age"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {showRFOverlay && filteredRFAthletes.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-primary/5">
              <h4 className="font-semibold mb-2">RF Athletes Current Ages:</h4>
              <div className="flex flex-wrap gap-2">
                {filteredRFAthletes.map(rf => (
                  <Badge key={rf.name} variant="outline" className="bg-primary/10">
                    {rf.name}: {rf.age} years
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Medal Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Medal Data</CardTitle>
          <CardDescription>Individual medal performances with athlete ages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-left p-2">Age</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-left p-2">Place</th>
                  <th className="text-left p-2">Competition</th>
                  <th className="text-left p-2">Year</th>
                  <th className="text-left p-2">Mark</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedalData.slice(0, 50).map((medal, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{medal.athlete_name || "Unknown"}</td>
                    <td className="p-2">{medal.age_at_competition}</td>
                    <td className="p-2">{medal.discipline}</td>
                    <td className="p-2">
                      <Badge
                        variant={
                          medal.place === "1." ? "default" : medal.place === "2." ? "secondary" : "outline"
                        }
                      >
                        {medal.place === "1." ? "🥇" : medal.place === "2." ? "🥈" : "🥉"}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm">{medal.competition}</td>
                    <td className="p-2">{medal.date ? new Date(medal.date).getFullYear() : "N/A"}</td>
                    <td className="p-2">{medal.mark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
