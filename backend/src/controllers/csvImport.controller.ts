import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../middleware/errorHandler";
import { runImport } from "../services/importOrchestrator.service";
import type { ImportStreamEvent } from "../types/crm.types";

/**
 * POST /api/csv/import
 *
 * Accepts a multipart CSV upload and streams newline-delimited JSON (NDJSON)
 * progress events as batches are processed, ending with a "done" event that
 * carries the full ImportSummary. Streaming lets the frontend show live
 * progress instead of a single opaque spinner for potentially large files.
 */
export async function importCsvHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const file = req.file;
  if (!file) {
    next(new HttpError(400, "No CSV file uploaded. Attach it under the 'file' field."));
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  const writeEvent = (event: ImportStreamEvent): void => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const summary = await runImport(file.buffer, writeEvent);
    writeEvent({ type: "done", summary });
    res.end();
  } catch (err) {
    if (res.headersSent) {
      const message = err instanceof Error ? err.message : "Import failed unexpectedly.";
      writeEvent({ type: "error", message });
      res.end();
      return;
    }
    next(err);
  }
}
