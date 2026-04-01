import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      {Icon && (
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-violet-400/20 dark:bg-violet-500/20 blur-xl" />
          <div className="relative w-14 h-14 rounded-2xl bg-violet-50 dark:bg-white/[0.05] border border-violet-100 dark:border-white/[0.08] flex items-center justify-center">
            <Icon size={24} className="text-violet-400 dark:text-violet-400/70" />
          </div>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        {description && <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
