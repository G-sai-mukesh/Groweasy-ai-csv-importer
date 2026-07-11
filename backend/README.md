# GrowEasy CSV Importer — Backend

Node.js + Express + TypeScript. See the [root README](../README.md) for the full project overview, architecture, and deployment guide.

## Local development

```bash
npm install
cp .env.example .env   # then set GEMINI_API_KEY
npm run dev
```

Runs on http://localhost:4000. Health check: `GET /health`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled build |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the unit test suite (Vitest) |

## API

### `POST /api/csv/import`

`multipart/form-data` with a `file` field (`.csv`, max 5MB by default).

Streams newline-delimited JSON (NDJSON) as the import progresses:

```
{"type":"meta","totalRows":50,"totalBatches":2,"batchSize":25}
{"type":"progress","batchIndex":0,"totalBatches":2,"processedRows":25,"totalRows":50}
{"type":"progress","batchIndex":1,"totalBatches":2,"processedRows":50,"totalRows":50}
{"type":"done","summary":{"totalRows":50,"totalImported":47,"totalSkipped":3,"imported":[...],"skipped":[...]}}
```

A batch that fails after retries emits `{"type":"batch_error",...}` and its rows are marked skipped in the final summary — the whole import never fails because of one bad batch.

## Structure

```
src/
  config/        env loading + validation (zod)
  controllers/   HTTP handlers
  routes/        Express routers
  middleware/    multer upload config, centralized error handler
  services/      CSV parsing, Gemini extraction, batching/streaming orchestration
  utils/         concurrency pool for parallel batch processing
  types/         shared CRM types
```
