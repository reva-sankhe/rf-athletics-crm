import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SeasonalTrendsTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Trends</CardTitle>
          <CardDescription>Coming soon - Performance trends and projections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Seasonal trends and projections (with dotted lines) will be implemented next</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
