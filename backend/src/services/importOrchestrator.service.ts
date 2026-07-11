import { env } from "../config/env";
import { parseCsvBuffer, CsvParseError } from "./csvParser.service";
import { chunkIntoBatches, extractBatch, AiExtractionError } from "./aiExtraction.service";
import { runWithConcurrencyLimit } from "../utils/concurrencyPool";
import type { CrmRecord, ExtractedRow, ImportStreamEvent, RawCsvRecord } from "../types/crm.types";

export { CsvParseError, AiExtractionError };

// A batch that fails after retries doesn't kill the whole import - those rows
// just get marked skipped with a reason, and the rest carries on.
export async function runImport(
  buffer: Buffer,
  onEvent: (event: ImportStreamEvent) => void
): Promise<{
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  imported: CrmRecord[];
  skipped: Array<{ row: RawCsvRecord; reason: string }>;
}> {
  const rows = parseCsvBuffer(buffer);
  const batches = chunkIntoBatches(rows, env.BATCH_SIZE);

  onEvent({ type: "meta", totalRows: rows.length, totalBatches: batches.length, batchSize: env.BATCH_SIZE });

  const results: Array<ExtractedRow | undefined> = new Array(rows.length);
  let processedRows = 0;

  const tasks = batches.map((batch) => () => extractBatch(batch));

  await runWithConcurrencyLimit(tasks, env.BATCH_CONCURRENCY, ({ index, value, error }) => {
    const batch = batches[index];

    if (error) {
      const message = error instanceof Error ? error.message : "Unknown AI extraction error";
      for (const { index: rowIndex } of batch) {
        results[rowIndex] = {
          sourceIndex: rowIndex,
          skipped: true,
          skipReason: `Batch processing failed: ${message}`,
          record: null,
        };
      }
      onEvent({ type: "batch_error", batchIndex: index, message });
    } else if (value) {
      for (const extracted of value) {
        results[extracted.sourceIndex] = extracted;
      }
    }

    processedRows += batch.length;
    onEvent({ type: "progress", batchIndex: index, totalBatches: batches.length, processedRows, totalRows: rows.length });
  });

  const imported: CrmRecord[] = [];
  const skipped: Array<{ row: RawCsvRecord; reason: string }> = [];

  results.forEach((result, i) => {
    if (result && !result.skipped && result.record) {
      imported.push(result.record);
    } else {
      skipped.push({
        row: rows[i],
        reason: result?.skipReason ?? "Row was not processed.",
      });
    }
  });

  return {
    totalRows: rows.length,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    imported,
    skipped,
  };
}
