import { useTeam } from "@/context/TeamContext";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

export function TeamSwitcher() {
  const { team, setTeam } = useTeam();

  const btn = (t: Team, label: string, color: string) => (
    <button
      key={t}
      data-testid={`team-switch-${t.toLowerCase()}`}
      onClick={() => setTeam(t)}
      className={cn(
        "px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
        team === t
          ? color + " text-white"
          : "bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex gap-1 p-1 rounded-lg bg-muted border border-border" data-testid="team-switcher">
      {btn("Sharks", "Sharks", "bg-blue-600")}
      {btn("Wildcats", "Wildcats", "bg-emerald-600")}
    </div>
  );
}
