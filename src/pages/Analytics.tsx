import { useTeam } from "@/context/TeamContext";
import { TeamSwitcher } from "@/components/TeamSwitcher";

export default function Analytics() {
  const { team } = useTeam();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Analytics <span className="text-indigo-500 dark:text-indigo-400">— {team}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance insights and metrics</p>
        </div>
        <TeamSwitcher />
      </div>

      {/* Placeholder Content */}
      <div className="bg-card border border-border rounded-2xl p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Analytics Coming Soon</h2>
          <p className="text-sm text-muted-foreground">
            Advanced analytics and performance tracking features will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
