import Papa from "papaparse";
import type { RawCsvRecord } from "./types";

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRecord[];
}

export class CsvClientParseError extends Error {}

// preview only - backend parses the file again itself on confirm
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRecord>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        if (!result.meta.fields || result.meta.fields.length === 0) {
          reject(new CsvClientParseError("Could not detect any columns in this CSV file."));
          return;
        }
        if (result.data.length === 0) {
          reject(new CsvClientParseError("This CSV file has no data rows."));
          return;
        }
        resolve({ headers: result.meta.fields, rows: result.data });
      },
      error: (error: Error) => {
        reject(new CsvClientParseError(error.message || "Failed to parse CSV file."));
      },
    });
  });
}
