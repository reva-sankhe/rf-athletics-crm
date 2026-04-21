import { useTeam, type Team } from "@/context/TeamContext";
import { cn } from "@/lib/utils";

const TEAMS: { id: Team; label: string }[] = [
  { id: "Team A", label: "Team A" },
  { id: "Team B", label: "Team B" },
];

export function TeamSwitcher() {
  const { team, setTeam } = useTeam();

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
      {TEAMS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTeam(t.id)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            team === t.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
