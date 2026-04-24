import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchWAToplists, fetchWARankings, fetchWAAthleteProfiles } from "@/lib/queries";
import type { WAToplist, WARanking, WAAthleteProfile } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

export function RankingsToplistsTab() {
  const [toplists, setToplists] = useState<WAToplist[]>([]);
  const [rankings, setRankings] = useState<WARanking[]>([]);
  const [rfAthletes, setRfAthletes] = useState<WAAthleteProfile[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("Men's 100m");
  const [selectedGender, setSelectedGender] = useState<string>("M");
  const [showWorld, setShowWorld] = useState(true);
  const [showAsian, setShowAsian] = useState(true);
  const [showIndian, setShowIndian] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedEvent, selectedGender]);

  async function loadData() {
    setLoading(true);
    try {
      const [toplistsData, rankingsData, rfAthletesData] = await Promise.all([
        fetchWAToplists(selectedEvent, selectedGender, 50),
        fetchWARankings(undefined, 100),
        fetchWAAthleteProfiles(),
      ]);
      setToplists(toplistsData);
      setRankings(rankingsData);
      setRfAthletes(rfAthletesData);
    } catch (error) {
      console.error("Error loading rankings data:", error);
    } finally {
      setLoading(false);
    }
  }

  const isRFAthlete = (athleteName: string) => {
    return rfAthletes.some(rf => rf.reliance_name === athleteName);
  };

  const filteredToplists = toplists.filter(item => {
    if (item.region === "Global" && !showWorld) return false;
    if (item.region === "Asia" && !showAsian) return false;
    if (item.nationality === "IND" && !showIndian) return false;
    return true;
  });

  const chartData = filteredToplists.slice(0, 20).map(item => ({
    name: item.athlete_name,
    score: parseInt(item.score) || 0,
    isRF: isRFAthlete(item.athlete_name),
    mark: item.mark,
    nationality: item.nationality,
  }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
          <CardDescription>Select event and regions to compare</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men's 100m">Men's 100m</SelectItem>
                  <SelectItem value="Men's 200m">Men's 200m</SelectItem>
                  <SelectItem value="Men's 400m">Men's 400m</SelectItem>
                  <SelectItem value="Women's 100m">Women's 100m</SelectItem>
                  <SelectItem value="Women's 200m">Women's 200m</SelectItem>
                  <SelectItem value="Women's 400m">Women's 400m</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
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

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="world" checked={showWorld} onCheckedChange={(checked) => setShowWorld(checked === true)} />
              <Label htmlFor="world">World Rankings</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="asian" checked={showAsian} onCheckedChange={(checked) => setShowAsian(checked === true)} />
              <Label htmlFor="asian">Asian Rankings</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="indian" checked={showIndian} onCheckedChange={(checked) => setShowIndian(checked === true)} />
              <Label htmlFor="indian">Indian Athletes</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toplists Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers by Score</CardTitle>
          <CardDescription>
            Comparing top 20 athletes - RF athletes highlighted in blue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No data available for selected filters</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.nationality}</p>
                          <p className="text-sm">Mark: {data.mark}</p>
                          <p className="text-sm">Score: {data.score}</p>
                          {data.isRF && <Badge className="mt-1">RF Athlete</Badge>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="score" name="Performance Score">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isRF ? "#3b82f6" : "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Athletes List */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Rankings</CardTitle>
          <CardDescription>Complete list with marks and scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-left p-2">Country</th>
                  <th className="text-left p-2">Mark</th>
                  <th className="text-left p-2">Score</th>
                  <th className="text-left p-2">Region</th>
                </tr>
              </thead>
              <tbody>
                {filteredToplists.slice(0, 50).map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b ${isRFAthlete(item.athlete_name) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                  >
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-medium">
                      {item.athlete_name}
                      {isRFAthlete(item.athlete_name) && (
                        <Badge variant="secondary" className="ml-2">RF</Badge>
                      )}
                    </td>
                    <td className="p-2">{item.nationality}</td>
                    <td className="p-2">{item.mark}</td>
                    <td className="p-2">{item.score}</td>
                    <td className="p-2">
                      <Badge variant="outline">{item.region}</Badge>
                    </td>
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
