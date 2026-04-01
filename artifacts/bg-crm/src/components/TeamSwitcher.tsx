import { useTeam } from "@/context/TeamContext";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";
import { Waves, Cat } from "lucide-react";

const TEAMS: { id: Team; label: string; icon: React.ElementType; activeClass: string }[] = [
  { id: "Sharks", label: "Sharks", icon: Waves, activeClass: "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-900/30" },
  { id: "Wildcats", label: "Wildcats", icon: Cat, activeClass: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/30" },
];

export function TeamSwitcher() {
  const { team, setTeam } = useTeam();

  return (
    <div
      className="inline-flex gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-sm"
      data-testid="team-switcher"
    >
      {TEAMS.map(({ id, label, icon: Icon, activeClass }) => (
        <button
          key={id}
          data-testid={`team-switch-${id.toLowerCase()}`}
          onClick={() => setTeam(id)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200",
            team === id
              ? activeClass
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}
