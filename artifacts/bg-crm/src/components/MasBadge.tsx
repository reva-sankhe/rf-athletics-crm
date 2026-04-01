import { getMasTier } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MasBadge({ mas, className }: { mas: number | null | undefined; className?: string }) {
  if (mas === null || mas === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const tier = getMasTier(mas);
  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", className)}
      style={{ backgroundColor: tier.color + "20", color: tier.color }}
    >
      {tier.label}
    </span>
  );
}
