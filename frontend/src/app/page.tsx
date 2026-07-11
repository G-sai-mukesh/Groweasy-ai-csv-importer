"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import {
  FileCheck2,
  FileX2,
  ListChecks,
  RotateCcw,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { FileDropzone } from "@/components/file-dropzone";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Stepper, type StepId } from "@/components/stepper";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatCard } from "@/components/stat-card";
import { ProgressPanel, type ImportProgressState } from "@/components/progress-panel";
import { Badge, StatusBadge } from "@/components/badge";
import { parseCsvFile, CsvClientParseError, type ParsedCsv } from "@/lib/csvClient";
import { streamCsvImport, ImportRequestError } from "@/lib/api";
import { CRM_FIELD_ORDER, type CrmRecord, type ImportSummary, type RawCsvRecord } from "@/lib/types";

type Phase = "upload" | "preview" | "importing" | "results";

const FIELD_LABELS: Record<keyof CrmRecord, string> = {
  created_at: "Created At",
  name: "Name",
  email: "Email",
  country_code: "Country Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead Owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession Time",
  description: "Description",
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [progress, setProgress] = useState<ImportProgressState>({
    totalRows: 0,
    totalBatches: 0,
    processedRows: 0,
    batchErrors: [],
  });

  const handleFileSelected = useCallback(async (selected: File) => {
    setParseError(null);
    try {
      const parsed = await parseCsvFile(selected);
      setFile(selected);
      setParsedCsv(parsed);
      setPhase("preview");
    } catch (err) {
      setParseError(err instanceof CsvClientParseError ? err.message : "Failed to parse CSV file.");
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!file) return;
    setImportError(null);
    setSummary(null);
    setProgress({ totalRows: 0, totalBatches: 0, processedRows: 0, batchErrors: [] });
    setPhase("importing");

    try {
      await streamCsvImport(file, (event) => {
        if (event.type === "meta") {
          setProgress((p) => ({ ...p, totalRows: event.totalRows, totalBatches: event.totalBatches }));
        } else if (event.type === "progress") {
          setProgress((p) => ({ ...p, processedRows: event.processedRows, totalRows: event.totalRows }));
        } else if (event.type === "batch_error") {
          setProgress((p) => ({ ...p, batchErrors: [...p.batchErrors, event.message] }));
        } else if (event.type === "done") {
          setSummary(event.summary);
          setPhase("results");
        } else if (event.type === "error") {
          setImportError(event.message);
          setPhase("preview");
        }
      });
    } catch (err) {
      setImportError(err instanceof ImportRequestError ? err.message : "Something went wrong while importing.");
      setPhase("preview");
    }
  }, [file]);

  const resetAll = useCallback(() => {
    setPhase("upload");
    setFile(null);
    setParsedCsv(null);
    setParseError(null);
    setImportError(null);
    setSummary(null);
  }, []);

  const previewColumns: DataTableColumn<RawCsvRecord>[] = useMemo(
    () => (parsedCsv ? parsedCsv.headers.map((h) => ({ key: h, header: h, width: 200 })) : []),
    [parsedCsv]
  );

  const resultColumns: DataTableColumn<CrmRecord>[] = useMemo(
    () =>
      CRM_FIELD_ORDER.map((key) => ({
        key,
        header: FIELD_LABELS[key],
        width: key === "crm_note" || key === "description" ? 280 : key === "email" ? 220 : 160,
        render:
          key === "crm_status"
            ? (row: CrmRecord) => <StatusBadge value={row.crm_status} />
            : key === "data_source"
              ? (row: CrmRecord) =>
                  row.data_source ? <Badge>{row.data_source}</Badge> : <span className="text-xs text-muted-foreground">—</span>
              : undefined,
      })),
    []
  );

  type SkippedDisplayRow = RawCsvRecord & { __reason: string; __i: string };

  const skippedRows: SkippedDisplayRow[] = useMemo(
    () => (summary ? summary.skipped.map((s, i) => ({ ...s.row, __reason: s.reason, __i: String(i) })) : []),
    [summary]
  );

  const skippedColumns: DataTableColumn<SkippedDisplayRow>[] = useMemo(() => {
    const headers = parsedCsv?.headers ?? (summary?.skipped[0] ? Object.keys(summary.skipped[0].row) : []);
    return [
      ...headers.map((h) => ({ key: h, header: h, width: 180 })),
      {
        key: "__reason",
        header: "Skip Reason",
        width: 280,
        render: (row: SkippedDisplayRow) => (
          <span className="text-xs text-rose-600 dark:text-rose-400">{row.__reason}</span>
        ),
      },
    ];
  }, [parsedCsv, summary]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0">
            <Image src="/logo-light.svg" alt="GrowEasy" fill className="dark:hidden" priority />
            <Image src="/logo-dark.svg" alt="GrowEasy" fill className="hidden dark:block" priority />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">GrowEasy CSV Importer</h1>
            <p className="text-xs text-muted-foreground">AI-powered lead mapping for any CSV layout</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Stepper current={(phase === "importing" ? "preview" : phase) as StepId} />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6">
        {phase === "upload" && (
          <section className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
            <div className="w-full max-w-xl">
              <FileDropzone onFileSelected={handleFileSelected} error={parseError} />
            </div>
            <p className="max-w-md text-center text-xs text-muted-foreground">
              Works with Facebook Lead Export, Google Ads Export, Excel sheets, real-estate CRM exports, sales
              reports, and manually created spreadsheets — any column names or layout.
            </p>
          </section>
        )}

        {phase === "preview" && parsedCsv && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-semibold">Preview</h2>
                <p className="text-sm text-muted-foreground">
                  {parsedCsv.rows.length} row{parsedCsv.rows.length === 1 ? "" : "s"} detected across{" "}
                  {parsedCsv.headers.length} column{parsedCsv.headers.length === 1 ? "" : "s"}. Nothing has been sent
                  to the server yet.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                >
                  <RotateCcw size={14} /> Choose different file
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  Confirm &amp; Import <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {importError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <DataTable columns={previewColumns} rows={parsedCsv.rows} getRowKey={(_, i) => i} maxHeight={520} />
          </section>
        )}

        {phase === "importing" && <ProgressPanel progress={progress} />}

        {phase === "results" && summary && (
          <section className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Rows" value={summary.totalRows} icon={ListChecks} />
              <StatCard label="Successfully Imported" value={summary.totalImported} icon={FileCheck2} tone="success" />
              <StatCard label="Skipped" value={summary.totalSkipped} icon={FileX2} tone="danger" />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Imported CRM Records</h2>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
              >
                <RotateCcw size={14} /> Import another file
              </button>
            </div>
            <DataTable
              columns={resultColumns}
              rows={summary.imported}
              getRowKey={(row, i) => `${row.email ?? row.mobile_without_country_code ?? "row"}-${i}`}
              emptyMessage="No records were successfully imported."
              maxHeight={480}
            />

            {summary.totalSkipped > 0 && (
              <>
                <h2 className="text-base font-semibold">Skipped Records</h2>
                <DataTable
                  columns={skippedColumns}
                  rows={skippedRows}
                  getRowKey={(row) => row.__i}
                  emptyMessage="No records were skipped."
                  maxHeight={360}
                />
              </>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
        Built for the GrowEasy Software Developer assignment.
      </footer>
    </div>
  );
}
