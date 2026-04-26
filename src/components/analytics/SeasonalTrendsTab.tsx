import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp } from "lucide-react";

export function SeasonalTrendsTab() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [results, setResults] = useState<WARFAthleteResult[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [athletesData, resultsData] = await Promise.all([
        fetchWAAthleteProfiles(),
        fetchWARFAthleteResults(undefined, 1000),
      ]);
      setAthletes(athletesData);
      setResults(resultsData);
      
      // Set first athlete as default
      if (athletesData.length > 0) {
        setSelectedAthlete(athletesData[0].aa_athlete_id);
      }
    } catch (error) {
      console.error("Error loading seasonal trends data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter results for selected athlete
  const athleteResults = results.filter(
    r => r.aa_athlete_id === selectedAthlete && !r.not_legal
  );

  // Group results by year and month
  const monthlyPerformance = athleteResults.reduce((acc, result) => {
    const date = new Date(result.date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[yearMonth]) {
      acc[yearMonth] = {
        yearMonth,
        scores: [],
        count: 0,
      };
    }
    
    acc[yearMonth].scores.push(result.result_score);
    acc[yearMonth].count += 1;
    
    return acc;
  }, {} as Record<string, { yearMonth: string; scores: number[]; count: number }>);

  // Calculate average and best for each month
  const monthlyData = Object.values(monthlyPerformance).map(month => ({
    yearMonth: month.yearMonth,
    avgScore: Math.round(month.scores.reduce((sum, s) => sum + s, 0) / month.scores.length),
    bestScore: Math.max(...month.scores),
    count: month.count,
  })).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  // Calculate projected trend (simple linear regression for next 3 months)
  const projectedData = [];
  if (monthlyData.length >= 3) {
    const recentData = monthlyData.slice(-6); // Last 6 months
    const avgGrowth = recentData.length > 1 
      ? (recentData[recentData.length - 1].avgScore - recentData[0].avgScore) / (recentData.length - 1)
      : 0;
    
    const lastMonth = recentData[recentData.length - 1];
    const lastDate = new Date(lastMonth.yearMonth + "-01");
    
    for (let i = 1; i <= 3; i++) {
      const projectedDate = new Date(lastDate);
      projectedDate.setMonth(projectedDate.getMonth() + i);
      const projectedYearMonth = `${projectedDate.getFullYear()}-${String(projectedDate.getMonth() + 1).padStart(2, '0')}`;
      
      projectedData.push({
        yearMonth: projectedYearMonth,
        projectedScore: Math.round(lastMonth.avgScore + (avgGrowth * i)),
        isProjected: true,
      });
    }
  }

  // Combine actual and projected data
  const combinedData = [
    ...monthlyData.map(d => ({ ...d, isProjected: false })),
    ...projectedData,
  ];

  // Yearly performance summary
  const yearlyPerformance = athleteResults.reduce((acc, result) => {
    const year = new Date(result.date).getFullYear();
    
    if (!acc[year]) {
      acc[year] = {
        year,
        scores: [],
        competitions: new Set(),
      };
    }
    
    acc[year].scores.push(result.result_score);
    acc[year].competitions.add(result.competition);
    
    return acc;
  }, {} as Record<number, { year: number; scores: number[]; competitions: Set<string> }>);

  const yearlyData = Object.values(yearlyPerformance).map(year => ({
    year: year.year.toString(),
    avgScore: Math.round(year.scores.reduce((sum, s) => sum + s, 0) / year.scores.length),
    bestScore: Math.max(...year.scores),
    competitions: year.competitions.size,
    results: year.scores.length,
  })).sort((a, b) => parseInt(a.year) - parseInt(b.year));

  const selectedAthleteData = athletes.find(a => a.aa_athlete_id === selectedAthlete);

  return (
    <div className="space-y-4">
      {/* Athlete Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Athlete Selection</CardTitle>
          <CardDescription>Select an athlete to view their seasonal trends and projections</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
            <SelectTrigger>
              <SelectValue placeholder="Select athlete" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map(athlete => (
                <SelectItem key={athlete.aa_athlete_id} value={athlete.aa_athlete_id}>
                  {athlete.reliance_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      {selectedAthleteData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{athleteResults.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {athleteResults.length > 0 ? Math.max(...athleteResults.map(r => r.result_score)) : "N/A"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-secondary">
                {athleteResults.length > 0 
                  ? Math.round(athleteResults.reduce((sum, r) => sum + r.result_score, 0) / athleteResults.length)
                  : "N/A"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Years Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-muted-foreground">
                {yearlyData.length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Performance Trend with Projections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Monthly Performance Trend
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardTitle>
          <CardDescription>
            Historical performance with 3-month projection (dotted line)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : athleteResults.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No performance data available for this athlete</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="yearMonth" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                           <p className="font-semibold">{data.yearMonth}</p>
                           {data.isProjected ? (
                             <p className="text-sm text-secondary">Projected: {data.projectedScore}</p>
                           ) : (
                            <>
                              <p className="text-sm">Avg Score: {data.avgScore}</p>
                              <p className="text-sm">Best Score: {data.bestScore}</p>
                              <p className="text-sm">Results: {data.count}</p>
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#D8B365" 
                  strokeWidth={2}
                  name="Average Score"
                  dot={{ r: 4 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="bestScore" 
                  stroke="#00A651" 
                  strokeWidth={2}
                  name="Best Score"
                  dot={{ r: 4 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="projectedScore" 
                  stroke="#9CA3AF" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Projected (3 months)"
                  dot={{ r: 4, fill: '#9CA3AF' }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Yearly Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Performance Summary</CardTitle>
          <CardDescription>Year-over-year performance comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : yearlyData.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No yearly data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">Year {data.year}</p>
                          <p className="text-sm">Avg Score: {data.avgScore}</p>
                          <p className="text-sm">Best Score: {data.bestScore}</p>
                          <p className="text-sm">Competitions: {data.competitions}</p>
                          <p className="text-sm">Total Results: {data.results}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="avgScore" fill="#D8B365" name="Average Score" />
                <Bar dataKey="bestScore" fill="#00A651" name="Best Score" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Yearly Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Yearly Statistics</CardTitle>
          <CardDescription>Complete breakdown by year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Year</th>
                  <th className="text-left p-2">Avg Score</th>
                  <th className="text-left p-2">Best Score</th>
                  <th className="text-left p-2">Competitions</th>
                  <th className="text-left p-2">Total Results</th>
                  <th className="text-left p-2">Growth</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((year, index) => {
                  const prevYear = index > 0 ? yearlyData[index - 1] : null;
                  const growth = prevYear 
                    ? ((year.avgScore - prevYear.avgScore) / prevYear.avgScore * 100).toFixed(1)
                    : null;
                  
                  return (
                    <tr key={year.year} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{year.year}</td>
                      <td className="p-2">{year.avgScore}</td>
                      <td className="p-2 text-primary font-semibold">{year.bestScore}</td>
                      <td className="p-2">{year.competitions}</td>
                      <td className="p-2">{year.results}</td>
                      <td className="p-2">
                        {growth ? (
                          <span className={parseFloat(growth) > 0 ? "text-primary" : "text-destructive"}>
                            {parseFloat(growth) > 0 ? "+" : ""}{growth}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
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
