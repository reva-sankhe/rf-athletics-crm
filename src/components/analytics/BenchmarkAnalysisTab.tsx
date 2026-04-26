import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWAQualificationStandards, fetchWARFAthleteResults, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAQualificationStandard, WARFAthleteResult, WAAthleteProfile } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Info } from "lucide-react";

export function BenchmarkAnalysisTab() {
  const [qualStandards, setQualStandards] = useState<WAQualificationStandard[]>([]);
  const [rfResults, setRfResults] = useState<WARFAthleteResult[]>([]);
  const [rfAthletes, setRfAthletes] = useState<WAAthleteProfile[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("100m");
  const [selectedGender, setSelectedGender] = useState<string>("M");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedEvent, selectedGender]);

  async function loadData() {
    setLoading(true);
    try {
      const [standardsData, resultsData, athletesData] = await Promise.all([
        fetchWAQualificationStandards(),
        fetchWARFAthleteResults(undefined, 200),
        fetchWAAthleteProfiles(),
      ]);
      setQualStandards(standardsData);
      setRfResults(resultsData);
      setRfAthletes(athletesData);
    } catch (error) {
      console.error("Error loading benchmark data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter standards by event and gender
  const filteredStandards = qualStandards.filter(
    s => s.event === selectedEvent && s.gender === selectedGender
  );

  // Get RF athlete best marks for the selected event
  const athleteBestMarks = rfAthletes.map(athlete => {
    // Improved event matching logic
    const eventPattern = selectedEvent.replace('m', '');
    const athleteResults = rfResults.filter(
      r => r.aa_athlete_id === athlete.aa_athlete_id && 
           !r.not_legal &&
           (r.discipline.includes(`${eventPattern} Metres`) || 
            r.discipline.includes(`${eventPattern}m`) ||
            r.discipline.toLowerCase().includes(selectedEvent.toLowerCase()))
    );
    
    if (athleteResults.length === 0) return null;
    
    // Get best result (highest score)
    const bestResult = athleteResults.reduce((best, current) => 
      current.result_score > best.result_score ? current : best
    );

    return {
      name: athlete.reliance_name,
      mark: bestResult.mark,
      score: bestResult.result_score,
      athleteId: athlete.aa_athlete_id,
    };
  }).filter(Boolean);

  // Get qualification standards
  const agQual = filteredStandards.find(s => s.competition === "Asian Games");
  const cwgQual = filteredStandards.find(s => s.competition === "Commonwealth Games");

  // Convert time string to seconds for comparison
  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(/[:.]/).map(Number);
    if (parts.length === 2) return parts[0] + parts[1] / 100; // seconds.centiseconds
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 100; // minutes:seconds.centiseconds
    return parseFloat(timeStr);
  };

  const chartData = athleteBestMarks.map(athlete => {
    if (!athlete) return null;
    
    const athleteTime = timeToSeconds(athlete.mark);
    const agQualTime = agQual ? timeToSeconds(agQual.standard) : null;
    const cwgQualTime = cwgQual ? timeToSeconds(cwgQual.standard) : null;

    return {
      name: athlete.name,
      score: athlete.score,
      mark: athlete.mark,
      agGap: agQualTime ? ((athleteTime - agQualTime) / agQualTime * 100).toFixed(2) : null,
      cwgGap: cwgQualTime ? ((athleteTime - cwgQualTime) / cwgQualTime * 100).toFixed(2) : null,
    };
  }).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Event Selection</CardTitle>
          <CardDescription>Select event to view qualification standards and athlete gaps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event</label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100m">100m</SelectItem>
                  <SelectItem value="200m">200m</SelectItem>
                  <SelectItem value="400m">400m</SelectItem>
                  <SelectItem value="800m">800m</SelectItem>
                  <SelectItem value="1500m">1500m</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Gender</label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Men</SelectItem>
                  <SelectItem value="F">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Qualification Standards */}
      <Card>
        <CardHeader>
          <CardTitle>Qualification Standards</CardTitle>
          <CardDescription>Current qualification marks for major championships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Olympic Games</p>
              <p className="text-2xl font-bold text-muted-foreground">No data</p>
              <Badge variant="outline" className="mt-2">Not available</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Asian Games</p>
              <p className="text-2xl font-bold">{agQual?.standard || "No data"}</p>
              {agQual && <Badge className="mt-2">{agQual.year}</Badge>}
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Commonwealth Games</p>
              <p className="text-2xl font-bold">{cwgQual?.standard || "No data"}</p>
              {cwgQual && <Badge className="mt-2">{cwgQual.year}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis Chart */}
      <Card>
        <CardHeader>
          <CardTitle>RF Athletes - Gap to Qualification</CardTitle>
          <CardDescription>
            Percentage gap from qualification standards (negative = faster than standard)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No athlete data available for this event</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: '% Gap', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm">Best Mark: {data.mark}</p>
                          <p className="text-sm">Score: {data.score}</p>
                          {data.agGap && <p className="text-sm">AG Gap: {data.agGap}%</p>}
                          {data.cwgGap && <p className="text-sm">CWG Gap: {data.cwgGap}%</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
                {agQual && <Bar dataKey="agGap" fill="#00A651" name="Asian Games Gap %" />}
                {cwgQual && <Bar dataKey="cwgGap" fill="#D8B365" name="Commonwealth Games Gap %" />}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Gap Analysis</CardTitle>
          <CardDescription>RF athletes performance vs qualification standards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-left p-2">Best Mark</th>
                  <th className="text-left p-2">Score</th>
                  <th className="text-left p-2">AG Gap</th>
                  <th className="text-left p-2">CWG Gap</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((athlete, index) => {
                  if (!athlete) return null;
                  return (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{athlete.name}</td>
                      <td className="p-2">{athlete.mark}</td>
                      <td className="p-2">{athlete.score}</td>
                      <td className="p-2">
                        {athlete.agGap ? (
                          <span className={parseFloat(athlete.agGap) < 0 ? "text-primary" : "text-muted-foreground"}>
                            {athlete.agGap}%
                          </span>
                        ) : "N/A"}
                      </td>
                      <td className="p-2">
                        {athlete.cwgGap ? (
                          <span className={parseFloat(athlete.cwgGap) < 0 ? "text-primary" : "text-muted-foreground"}>
                            {athlete.cwgGap}%
                          </span>
                        ) : "N/A"}
                      </td>
                      <td className="p-2">
                        {athlete.agGap && parseFloat(athlete.agGap) < 0 ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">Qualified (AG)</Badge>
                        ) : athlete.cwgGap && parseFloat(athlete.cwgGap) < 0 ? (
                          <Badge className="bg-secondary/10 text-secondary border-secondary/20">Qualified (CWG)</Badge>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
