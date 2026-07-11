"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: number;
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  emptyMessage?: string;
  maxHeight?: number;
  className?: string;
}

const DEFAULT_COLUMN_WIDTH = 200;
const ROW_HEIGHT = 44;
const VIRTUALIZE_THRESHOLD = 60;

/**
 * A responsive data grid built on CSS grid rather than <table>, so header and
 * body rows can share one horizontally-scrolling track while the header stays
 * sticky and large row counts get vertically virtualized without layout
 * thrash. Falls back to plain rendering under VIRTUALIZE_THRESHOLD rows.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No data to display.",
  maxHeight = 480,
  className,
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const gridTemplateColumns = useMemo(
    () => columns.map((c) => `${c.width ?? DEFAULT_COLUMN_WIDTH}px`).join(" "),
    [columns]
  );
  const totalWidth = useMemo(
    () => columns.reduce((sum, c) => sum + (c.width ?? DEFAULT_COLUMN_WIDTH), 0),
    [columns]
  );

  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: shouldVirtualize,
  });

  if (rows.length === 0) {
    return (
      <div className={cn("flex h-40 items-center justify-center rounded-xl border border-border bg-surface text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  const renderRow = (row: T, index: number, style?: React.CSSProperties) => (
    <div
      key={getRowKey(row, index)}
      role="row"
      style={{ gridTemplateColumns, width: totalWidth, ...style }}
      className={cn(
        "grid items-center border-b border-border/60 text-sm transition-colors hover:bg-surface-muted/70",
        style ? "absolute left-0 top-0" : undefined
      )}
    >
      {columns.map((col) => (
        <div key={col.key} role="cell" className="truncate px-4 py-2.5" title={typeof (row as Record<string, unknown>)[col.key] === "string" ? String((row as Record<string, unknown>)[col.key]) : undefined}>
          {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? "")}
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}>
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight }}>
        <div style={{ width: totalWidth, minWidth: "100%" }}>
          <div
            role="row"
            style={{ gridTemplateColumns, width: totalWidth }}
            className="sticky top-0 z-10 grid border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {columns.map((col) => (
              <div key={col.key} role="columnheader" className="truncate px-4 py-3">
                {col.header}
              </div>
            ))}
          </div>

          {shouldVirtualize ? (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) =>
                renderRow(rows[virtualRow.index], virtualRow.index, {
                  transform: `translateY(${virtualRow.start}px)`,
                  height: ROW_HEIGHT,
                })
              )}
            </div>
          ) : (
            rows.map((row, index) => renderRow(row, index))
          )}
        </div>
      </div>
    </div>
  );
}
