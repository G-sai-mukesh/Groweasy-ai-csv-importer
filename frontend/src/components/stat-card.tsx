import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger";
}

const TONE_STYLES = {
  default: "text-primary bg-primary/10",
  success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  danger: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
} as const;

export function StatCard({ label, value, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", TONE_STYLES[tone])}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
