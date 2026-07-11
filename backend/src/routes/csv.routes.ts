import { Router } from "express";
import { csvUpload } from "../middleware/upload.middleware";
import { importCsvHandler } from "../controllers/csvImport.controller";

export const csvRouter = Router();

csvRouter.post("/import", csvUpload.single("file"), importCsvHandler);
