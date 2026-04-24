import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TeamPerformanceTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Coming soon - RF team metrics and readiness scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Team performance dashboard will be implemented next</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
