# GrowEasy CSV Importer

An AI-powered CSV importer that maps **any** lead export — Facebook Lead Ads, Google Ads, real-estate CRM exports, sales reports, or a hand-built spreadsheet — into GrowEasy's canonical CRM schema, regardless of column names or layout.

Built for the GrowEasy Software Developer assignment.

- **Live app:** https://groweasy-ai-csv-importer-ten.vercel.app/
- **Live API:** https://groweasy-ai-csv-importer-backend-awi3.onrender.com

## How it works

1. **Upload** a CSV (drag & drop or file picker).
2. **Preview** it client-side — parsed and rendered in a table immediately, with zero network calls. You can bail out here with no server-side cost.
3. **Confirm** the import. Only now does the file get sent to the backend.
4. The backend re-parses the CSV, splits it into batches, and sends each batch to **Gemini** with a schema-constrained prompt that maps arbitrary columns into GrowEasy's CRM fields. Batches are processed concurrently and progress streams back to the browser live (NDJSON over HTTP, not a fixed spinner).
5. **Results** — a stats summary (total / imported / skipped) plus two tables: successfully mapped CRM records, and skipped rows with the exact reason each was skipped.

## Why this is hard (and how it's handled)

The brief is explicit that the challenge isn't parsing CSV — it's making arbitrary, unpredictable column layouts resolve into a fixed schema. Concretely:

| Problem | Approach |
| --- | --- |
| Column names vary wildly between exports | No fixed-header assumption anywhere in the pipeline — the parser keys rows by whatever headers exist, and the AI prompt is given the raw headers + values with no hardcoded mapping |
| The model might return malformed JSON or invent enum values | Gemini's **structured output** (`responseSchema` + `responseMimeType: application/json`) constrains `crm_status` / `data_source` to literal enums server-side, at the API level — not just via prompt instructions |
| The model might still get an enum or skip decision wrong | A defensive normalization pass in [`aiExtraction.service.ts`](backend/src/services/aiExtraction.service.ts) re-validates every enum value against the allowlist and **re-derives the skip decision from the actual email/mobile fields**, rather than trusting the model's `skipped` flag blindly |
| One bad batch shouldn't fail an entire large import | Each batch is retried independently (exponential backoff, only for transient errors like 429/503 — not for a genuinely invalid request); if it still fails, only that batch's rows are marked skipped with a clear reason, and the rest of the import completes normally |
| Multiple emails/phones per row | First email/phone becomes the canonical value; the rest are appended into `crm_note`, per spec |
| Users shouldn't stare at a blank spinner on a large file | The import endpoint streams NDJSON progress events per batch as they complete, so the UI shows a live "X / Y rows processed" progress bar instead of one opaque loading state |

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, TanStack Virtual (large-table virtualization), next-themes (dark mode)
- **Backend:** Node.js, Express, TypeScript, Multer, `csv-parse`, Zod (env validation)
- **AI:** Google Gemini (`@google/generative-ai`), structured JSON output
- **Testing:** Vitest (backend unit tests)

## Project structure

```
PR-M/
├── frontend/                        Next.js app
│   └── src/
│       ├── app/                     Pages, layout, global styles
│       ├── components/              Data table, dropzone, stepper, badges, etc.
│       └── lib/                     CSV client parsing, streaming API client, shared types, utils
├── backend/                         Express API
│   └── src/
│       ├── config/                  Env loading + validation (zod)
│       ├── controllers/             HTTP handlers
│       ├── routes/                  Express routers
│       ├── middleware/              Multer upload config, centralized error handler
│       ├── services/                CSV parsing, Gemini extraction, batching/streaming orchestration
│       ├── utils/                   Concurrency pool for parallel batch processing
│       └── types/                   Shared CRM types
└── docker-compose.yml
```

## Running locally

You need two terminals — the backend and frontend run as separate processes.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env and set GEMINI_API_KEY (see below)
npm run dev
```

Starts on `http://localhost:4000`. Check `http://localhost:4000/health`.

**Getting a Gemini API key:** go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in, click "Create API key". It looks like `AIzaSy...`. Paste it into `backend/.env` as `GEMINI_API_KEY`.

> Note: not every Gemini model is enabled on every key/project. `GEMINI_MODEL` defaults to `gemini-flash-latest`, which is broadly available; if you hit a 404 for a specific model name, list available models for your key or switch to another current Gemini model.

**Backend scripts:**

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled build |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the unit test suite (Vitest) |

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Starts on `http://localhost:3000` (or the next free port). Open it in a browser — both servers must be running.

**Frontend scripts:**

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## API reference

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

## CRM field mapping reference

| Field | Notes |
| --- | --- |
| `created_at` | Must be parseable by `new Date(...)` |
| `crm_status` | One of `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`, or empty |
| `data_source` | One of `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`, or empty |
| `crm_note` | Remarks, extra emails/numbers beyond the first, anything without a dedicated field |
| skip rule | A row with **neither** an email **nor** a mobile number is skipped, not imported |

## Testing

```bash
cd backend
npm test
```

20 unit tests covering CSV parsing edge cases, AI-response normalization (enum validation, skip-rule enforcement independent of what the model claims), the concurrency pool, and batch-failure isolation in the import orchestrator.

## Deployment

### Backend → Railway or Render

1. Push this repo to GitHub.
2. Create a new **Web Service** on [Railway](https://railway.app) or [Render](https://render.com), pointing at this repo with **root directory `backend`**.
3. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Set environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL` (optional), `CORS_ORIGIN` (your deployed frontend URL — set this *after* the step below), `NODE_ENV=production`.
5. Deploy. Note the resulting URL (e.g. `https://groweasy-backend.up.railway.app`).

### Frontend → Vercel

1. Import the same GitHub repo into [Vercel](https://vercel.com/new), with **root directory `frontend`**.
2. Framework preset: Next.js (auto-detected).
3. Set environment variable `NEXT_PUBLIC_API_URL` to your backend's deployed URL from the step above.
4. Deploy. Note the resulting URL.
5. Go back to your backend host and set `CORS_ORIGIN` to this frontend URL, then redeploy the backend so CORS allows it.

### Docker (optional, untested in the environment this was built in — verify locally before relying on it)

```bash
GEMINI_API_KEY=your_key docker compose up --build
```

Frontend on `:3000`, backend on `:4000`.

## Bonus features implemented

- [x] Drag & drop upload
- [x] Live progress indicator during AI processing (streamed, not simulated)
- [x] Streaming/incremental result delivery (NDJSON)
- [x] Retry mechanism for failed AI batches (exponential backoff on transient errors)
- [x] Virtualized results table (kicks in automatically above ~60 rows)
- [x] Dark mode
- [x] Unit tests (Vitest, backend)
- [x] Docker setup
- [x] Deployed to Vercel + Render — see links at the top of this README
