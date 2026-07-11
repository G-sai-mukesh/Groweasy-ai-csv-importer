import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  SALE_DONE: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  DID_NOT_CONNECT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  BAD_LEAD: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const style = STATUS_STYLES[value] ?? "bg-slate-500/15 text-slate-600 dark:text-slate-400";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", style)}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "danger" | "success" }) {
  const toneStyles = {
    default: "bg-surface-muted text-foreground",
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", toneStyles[tone])}>
      {children}
    </span>
  );
}
