import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { env } from "../config/env";
import { CsvParseError } from "../services/csvParser.service";
import { AiExtractionError } from "../services/aiExtraction.service";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    // Streaming response already started; just end it.
    res.end();
    return;
  }

  let status = 500;
  let message = "Internal server error.";

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
  } else if (err instanceof MulterError) {
    status = 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? `File too large. Max size is ${env.MAX_FILE_SIZE_MB}MB.` : err.message;
  } else if (err instanceof CsvParseError) {
    status = 400;
    message = err.message;
  } else if (err instanceof AiExtractionError) {
    status = 502;
    message = err.message;
  } else if (err instanceof Error) {
    status = err.message.includes(".csv") ? 400 : 500;
    message = err.message;
  }

  if (status === 500 && env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(status).json({ error: message });
}
