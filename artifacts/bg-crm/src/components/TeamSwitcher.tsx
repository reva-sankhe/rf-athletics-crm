import { useTeam } from "@/context/TeamContext";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

const TEAMS: { id: Team; label: string; activeClass: string }[] = [
  { id: "Sharks", label: "Sharks", activeClass: "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm" },
  { id: "Wildcats", label: "Wildcats", activeClass: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm" },
];

export function TeamSwitcher() {
  const { team, setTeam } = useTeam();

  return (
    <div
      className="inline-flex gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]"
      data-testid="team-switcher"
    >
      {TEAMS.map(({ id, label, activeClass }) => (
        <button
          key={id}
          data-testid={`team-switch-${id.toLowerCase()}`}
          onClick={() => setTeam(id)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150",
            team === id
              ? activeClass
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
