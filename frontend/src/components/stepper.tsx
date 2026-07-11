import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepId = "upload" | "preview" | "results";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "upload", label: "Upload CSV" },
  { id: "preview", label: "Preview" },
  { id: "results", label: "Results" },
];

export function Stepper({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
        return (
          <li key={step.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "active" && "bg-primary/15 text-primary ring-2 ring-primary",
                  state === "upcoming" && "bg-surface-muted text-muted-foreground"
                )}
              >
                {state === "done" ? <Check size={14} /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && <div className="h-px w-6 bg-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}
