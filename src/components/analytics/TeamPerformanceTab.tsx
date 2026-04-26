import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function TeamPerformanceTab() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [results, setResults] = useState<WARFAthleteResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [athletesData, resultsData] = await Promise.all([
        fetchWAAthleteProfiles(),
        fetchWARFAthleteResults(undefined, 500),
      ]);
      setAthletes(athletesData);
      setResults(resultsData);
    } catch (error) {
      console.error("Error loading team performance data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate athlete readiness scores based on recent performance
  const athleteReadiness = athletes.map(athlete => {
    const athleteResults = results.filter(
      r => r.aa_athlete_id === athlete.aa_athlete_id && !r.not_legal
    );
    
    if (athleteResults.length === 0) return null;
    
    // Sort by date descending
    athleteResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Get recent results (last 5)
    const recentResults = athleteResults.slice(0, 5);
    const avgRecentScore = recentResults.reduce((sum, r) => sum + r.result_score, 0) / recentResults.length;
    
    // Calculate trend (comparing recent vs older results)
    const olderResults = athleteResults.slice(5, 10);
    let trend: "up" | "down" | "stable" = "stable";
    if (olderResults.length > 0) {
      const avgOlderScore = olderResults.reduce((sum, r) => sum + r.result_score, 0) / olderResults.length;
      const diff = avgRecentScore - avgOlderScore;
      if (diff > 10) trend = "up";
      else if (diff < -10) trend = "down";
    }
    
    // Readiness score (0-100)
    const readinessScore = Math.min(100, Math.round((avgRecentScore / 1200) * 100));
    
    return {
      name: athlete.reliance_name,
      readinessScore,
      avgRecentScore: Math.round(avgRecentScore),
      recentResultsCount: recentResults.length,
      trend,
      athleteId: athlete.aa_athlete_id,
    };
  }).filter(Boolean);

  // Sort by readiness score
  athleteReadiness.sort((a, b) => (b?.readinessScore || 0) - (a?.readinessScore || 0));

  // Calculate readiness distribution
  const readinessDistribution = athleteReadiness.reduce((acc, athlete) => {
    if (!athlete) return acc;
    const category = athlete.readinessScore >= 80 ? "High" :
                     athlete.readinessScore >= 60 ? "Medium" :
                     athlete.readinessScore >= 40 ? "Low" : "Very Low";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const readinessDistributionData = Object.entries(readinessDistribution).map(([category, count]) => ({
    category,
    count,
  }));

  // Event distribution
  const eventDistribution = athletes.reduce((acc, athlete) => {
    if (athlete.reliance_events) {
      const events = athlete.reliance_events.split(',').map(e => e.trim());
      events.forEach(event => {
        acc[event] = (acc[event] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const eventDistributionData = Object.entries(eventDistribution)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 events

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-4">
      {/* Team Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{athletes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {athleteReadiness.filter(a => a && a.readinessScore >= 80).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Improving</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {athleteReadiness.filter(a => a && a.trend === "up").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {athleteReadiness.filter(a => a && a.readinessScore < 40).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Athlete Readiness Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Athlete Readiness Scores</CardTitle>
          <CardDescription>Current readiness based on recent performance (0-100 scale)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : athleteReadiness.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No athlete data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={athleteReadiness.slice(0, 15)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm">Readiness: {data.readinessScore}/100</p>
                          <p className="text-sm">Avg Score: {data.avgRecentScore}</p>
                          <p className="text-sm">Recent Results: {data.recentResultsCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="readinessScore" name="Readiness Score" fill="#3b82f6">
                  {athleteReadiness.slice(0, 15).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry && entry.readinessScore >= 80 ? '#10b981' : 
                            entry && entry.readinessScore >= 60 ? '#3b82f6' :
                            entry && entry.readinessScore >= 40 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Readiness Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Readiness Distribution</CardTitle>
            <CardDescription>Athletes grouped by readiness level</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">Loading data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={readinessDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, count }) => `${category}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {readinessDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Distribution</CardTitle>
            <CardDescription>Top events by athlete count</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">Loading data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="event" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Athletes" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Athlete Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Athlete Readiness</CardTitle>
          <CardDescription>Complete list with performance trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Athlete</th>
                  <th className="text-left p-2">Readiness</th>
                  <th className="text-left p-2">Avg Score</th>
                  <th className="text-left p-2">Trend</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {athleteReadiness.map((athlete, index) => {
                  if (!athlete) return null;
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{index + 1}</td>
                      <td className="p-2">{athlete.name}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                athlete.readinessScore >= 80 ? 'bg-green-600' :
                                athlete.readinessScore >= 60 ? 'bg-blue-600' :
                                athlete.readinessScore >= 40 ? 'bg-orange-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${athlete.readinessScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{athlete.readinessScore}</span>
                        </div>
                      </td>
                      <td className="p-2">{athlete.avgRecentScore}</td>
                      <td className="p-2">
                        {athlete.trend === "up" && <TrendingUp className="h-5 w-5 text-green-600" />}
                        {athlete.trend === "down" && <TrendingDown className="h-5 w-5 text-red-600" />}
                        {athlete.trend === "stable" && <Minus className="h-5 w-5 text-gray-600" />}
                      </td>
                      <td className="p-2">
                        {athlete.readinessScore >= 80 ? (
                          <Badge variant="default" className="bg-green-600">Ready</Badge>
                        ) : athlete.readinessScore >= 60 ? (
                          <Badge variant="default">Good</Badge>
                        ) : athlete.readinessScore >= 40 ? (
                          <Badge variant="secondary">Moderate</Badge>
                        ) : (
                          <Badge variant="destructive">Needs Work</Badge>
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
