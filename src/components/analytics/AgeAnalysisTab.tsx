import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AgeAnalysisTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Age Analysis</CardTitle>
          <CardDescription>Coming soon - Age distribution and peak performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Age analysis features will be implemented next</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
