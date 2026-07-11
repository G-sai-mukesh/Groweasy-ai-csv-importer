import { parse } from "csv-parse/sync";
import type { RawCsvRecord } from "../types/crm.types";

export class CsvParseError extends Error {}

// No fixed column names here on purpose - whatever headers the file has become
// the object keys, and the AI mapping step deals with making sense of them.
export function parseCsvBuffer(buffer: Buffer): RawCsvRecord[] {
  let records: RawCsvRecord[];
  try {
    records = parse(buffer, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  } catch (err) {
    throw new CsvParseError(
      err instanceof Error ? `Failed to parse CSV: ${err.message}` : "Failed to parse CSV"
    );
  }

  if (records.length === 0) {
    throw new CsvParseError("CSV file contains no data rows.");
  }

  // exported sheets often have trailing blank rows
  return records.filter((row) => Object.values(row).some((v) => v && v.trim().length > 0));
}
