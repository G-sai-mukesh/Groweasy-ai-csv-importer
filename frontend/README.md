# GrowEasy CSV Importer — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS. See the [root README](../README.md) for the full project overview, architecture, and deployment guide.

## Local development

```bash
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm run dev
```

Runs on http://localhost:3000 (falls back to the next free port if taken).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Structure

```
src/
  app/            # App Router pages, layout, global styles
  components/      # UI building blocks (data table, dropzone, stepper, etc.)
  lib/              # CSV client parsing, streaming API client, shared types, utils
```
