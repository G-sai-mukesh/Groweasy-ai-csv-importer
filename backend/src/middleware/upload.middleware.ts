import multer from "multer";
import { env } from "../config/env";

const CSV_MIME_TYPES = new Set(["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"]);

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsvExtension = file.originalname.toLowerCase().endsWith(".csv");
    const isCsvMimeType = CSV_MIME_TYPES.has(file.mimetype);
    if (isCsvExtension || isCsvMimeType) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are supported."));
    }
  },
});
