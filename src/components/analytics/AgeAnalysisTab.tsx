import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWAAthleteProfiles, fetchWARFAthleteResults } from "@/lib/queries";
import type { WAAthleteProfile, WARFAthleteResult } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

export function AgeAnalysisTab() {
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
      console.error("Error loading age analysis data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate age distribution
  const ageDistribution = athletes.reduce((acc, athlete) => {
    if (athlete.age) {
      const ageGroup = athlete.age < 20 ? "U20" : 
                       athlete.age < 25 ? "20-24" :
                       athlete.age < 30 ? "25-29" :
                       athlete.age < 35 ? "30-34" : "35+";
      acc[ageGroup] = (acc[ageGroup] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const ageDistributionData = Object.entries(ageDistribution).map(([ageGroup, count]) => ({
    ageGroup,
    count,
  }));

  // Calculate average performance by age group
  const performanceByAge = athletes.map(athlete => {
    if (!athlete.age) return null;
    
    const athleteResults = results.filter(
      r => r.aa_athlete_id === athlete.aa_athlete_id && !r.not_legal
    );
    
    if (athleteResults.length === 0) return null;
    
    const avgScore = athleteResults.reduce((sum, r) => sum + r.result_score, 0) / athleteResults.length;
    
    return {
      age: athlete.age,
      avgScore: Math.round(avgScore),
      name: athlete.reliance_name,
      resultsCount: athleteResults.length,
    };
  }).filter(Boolean);

  // Group by age for chart
  const agePerformanceData = performanceByAge.reduce((acc, item) => {
    if (!item) return acc;
    const existing = acc.find(a => a.age === item.age);
    if (existing) {
      existing.avgScore = Math.round((existing.avgScore + item.avgScore) / 2);
      existing.athleteCount += 1;
    } else {
      acc.push({ age: item.age, avgScore: item.avgScore, athleteCount: 1 });
    }
    return acc;
  }, [] as Array<{ age: number; avgScore: number; athleteCount: number }>);

  agePerformanceData.sort((a, b) => a.age - b.age);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-4">
      {/* Age Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Age Distribution</CardTitle>
          <CardDescription>Distribution of RF athletes by age group</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={ageDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageGroup" />
                <YAxis label={{ value: 'Number of Athletes', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Athletes" fill="#3b82f6">
                  {ageDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Performance by Age */}
      <Card>
        <CardHeader>
          <CardTitle>Average Performance by Age</CardTitle>
          <CardDescription>Average result score across different ages</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : agePerformanceData.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-muted-foreground">No performance data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={agePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">Age: {data.age}</p>
                          <p className="text-sm">Avg Score: {data.avgScore}</p>
                          <p className="text-sm">Athletes: {data.athleteCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="avgScore" name="Average Score" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Peak Performance Age */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Performance Insights</CardTitle>
          <CardDescription>Key statistics about age and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Average Age</p>
              <p className="text-2xl font-bold">
                {athletes.length > 0 
                  ? Math.round(athletes.reduce((sum, a) => sum + (a.age || 0), 0) / athletes.filter(a => a.age).length)
                  : "N/A"}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Peak Performance Age</p>
              <p className="text-2xl font-bold">
                {agePerformanceData.length > 0
                  ? agePerformanceData.reduce((max, curr) => curr.avgScore > max.avgScore ? curr : max).age
                  : "N/A"}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Age Range</p>
              <p className="text-2xl font-bold">
                {athletes.length > 0 && athletes.some(a => a.age)
                  ? `${Math.min(...athletes.filter(a => a.age).map(a => a.age!))} - ${Math.max(...athletes.filter(a => a.age).map(a => a.age!))}`
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
