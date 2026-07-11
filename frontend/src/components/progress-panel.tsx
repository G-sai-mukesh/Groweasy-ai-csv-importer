import { Loader2, AlertTriangle } from "lucide-react";

export interface ImportProgressState {
  totalRows: number;
  totalBatches: number;
  processedRows: number;
  batchErrors: string[];
}

export function ProgressPanel({ progress }: { progress: ImportProgressState }) {
  const pct =
    progress.totalRows > 0 ? Math.min(100, Math.round((progress.processedRows / progress.totalRows) * 100)) : 0;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface p-10 text-center">
      <Loader2 className="animate-spin text-primary" size={32} />
      <div className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">AI is mapping your leads&hellip;</span>
          <span className="tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {progress.processedRows} / {progress.totalRows} rows processed
          {progress.totalBatches > 0 && ` · batch size ${Math.ceil(progress.totalRows / progress.totalBatches)}`}
        </p>
      </div>

      {progress.batchErrors.length > 0 && (
        <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-700 dark:text-amber-400">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <AlertTriangle size={14} />
            {progress.batchErrors.length} batch{progress.batchErrors.length > 1 ? "es" : ""} retried and failed —
            affected rows will be marked as skipped
          </div>
        </div>
      )}
    </div>
  );
}
