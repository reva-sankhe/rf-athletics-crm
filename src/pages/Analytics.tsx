import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RFSquadTab } from "@/components/analytics/RFSquadTab";
import { GlobalStandingsTab } from "@/components/analytics/GlobalStandingsTab";
import { QualificationTrackerTab } from "@/components/analytics/QualificationTrackerTab";
import { ScoutingRadarTab } from "@/components/analytics/ScoutingRadarTab";
import { FinalsBenchmarkTab } from "@/components/analytics/FinalsBenchmarkTab";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("squad");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Performance intelligence for the RF squad
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="squad">RF Squad</TabsTrigger>
          <TabsTrigger value="standings">Global Standings</TabsTrigger>
          <TabsTrigger value="qualification">Qualification</TabsTrigger>
          <TabsTrigger value="scouting">Scouting</TabsTrigger>
          <TabsTrigger value="finals">Finals Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="squad" className="space-y-4">
          <RFSquadTab />
        </TabsContent>

        <TabsContent value="standings" className="space-y-4">
          <GlobalStandingsTab />
        </TabsContent>

        <TabsContent value="qualification" className="space-y-4">
          <QualificationTrackerTab />
        </TabsContent>

        <TabsContent value="scouting" className="space-y-4">
          <ScoutingRadarTab />
        </TabsContent>

        <TabsContent value="finals" className="space-y-4">
          <FinalsBenchmarkTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
