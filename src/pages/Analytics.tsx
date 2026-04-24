import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RankingsToplistsTab } from "@/components/analytics/RankingsToplistsTab";
import { BenchmarkAnalysisTab } from "@/components/analytics/BenchmarkAnalysisTab";
import { AgeAnalysisTab } from "@/components/analytics/AgeAnalysisTab";
import { TeamPerformanceTab } from "@/components/analytics/TeamPerformanceTab";
import { SeasonalTrendsTab } from "@/components/analytics/SeasonalTrendsTab";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("rankings");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance insights and competitive analysis
          </p>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rankings">Rankings & Toplists</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmark Analysis</TabsTrigger>
          <TabsTrigger value="age">Age Analysis</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="trends">Seasonal Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4">
          <RankingsToplistsTab />
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <BenchmarkAnalysisTab />
        </TabsContent>

        <TabsContent value="age" className="space-y-4">
          <AgeAnalysisTab />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <TeamPerformanceTab />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <SeasonalTrendsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
