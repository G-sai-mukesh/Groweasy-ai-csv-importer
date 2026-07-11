import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { env } from "../config/env";
import {
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  type CrmRecord,
  type ExtractedRow,
  type RawCsvRecord,
} from "../types/crm.types";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const responseSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      sourceIndex: { type: SchemaType.INTEGER, description: "Echo back the input row's index unchanged." },
      skipped: {
        type: SchemaType.BOOLEAN,
        description: "true if the row has neither a usable email nor a mobile number.",
      },
      skipReason: { type: SchemaType.STRING, nullable: true },
      created_at: { type: SchemaType.STRING, nullable: true },
      name: { type: SchemaType.STRING, nullable: true },
      email: { type: SchemaType.STRING, nullable: true },
      country_code: { type: SchemaType.STRING, nullable: true },
      mobile_without_country_code: { type: SchemaType.STRING, nullable: true },
      company: { type: SchemaType.STRING, nullable: true },
      city: { type: SchemaType.STRING, nullable: true },
      state: { type: SchemaType.STRING, nullable: true },
      country: { type: SchemaType.STRING, nullable: true },
      lead_owner: { type: SchemaType.STRING, nullable: true },
      crm_status: {
        type: SchemaType.STRING,
        enum: [...CRM_STATUS_VALUES],
        nullable: true,
        description: "One of the allowed status values, or null if none match confidently.",
      },
      crm_note: { type: SchemaType.STRING, nullable: true },
      data_source: {
        type: SchemaType.STRING,
        enum: [...DATA_SOURCE_VALUES],
        nullable: true,
        description: "One of the allowed source values, or null if none match confidently.",
      },
      possession_time: { type: SchemaType.STRING, nullable: true },
      description: { type: SchemaType.STRING, nullable: true },
    },
    required: ["sourceIndex", "skipped"],
  },
};

const SYSTEM_INSTRUCTIONS = `You are a data-mapping engine for GrowEasy CRM's lead importer.

You will receive a JSON array of raw CSV rows. Each row has an "index" (its original
position) and a "data" object whose keys are the CSV's original column headers, which
vary wildly between uploads (Facebook Lead Export, Google Ads Export, Excel sheets,
real-estate CRM exports, sales reports, manually created spreadsheets, etc). You must
map each row's available fields into the GrowEasy CRM schema below, using your judgement
to match differently-named or differently-structured columns to the right field.

CRM FIELDS TO PRODUCE FOR EACH ROW:
- created_at: lead creation date/time. Must be a string parseable by JavaScript's
  \`new Date(created_at)\`. Prefer ISO-like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD". If no
  date is present, use null.
- name: the lead's full name. Combine first/last name columns if split across two columns.
- email: primary email address.
- country_code: phone country code including "+", e.g. "+91". Infer from a combined phone
  number if the country code isn't in its own column. Default to "+91" only if the phone
  number's format strongly implies India and no other signal contradicts it; otherwise null.
- mobile_without_country_code: the phone number digits only, with the country code and any
  formatting (spaces, dashes, parentheses) stripped.
- company: company / organisation name.
- city, state, country: location fields, mapped from any address-like columns.
- lead_owner: the salesperson/agent/owner assigned to the lead (often an email or name).
- crm_status: MUST be exactly one of "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD",
  "SALE_DONE", or null if nothing in the row maps confidently to a status. Never invent a
  status that isn't clearly implied.
- crm_note: remarks, follow-up notes, additional comments, extra phone numbers beyond the
  first, extra email addresses beyond the first, and any other useful information from the
  row that doesn't fit a dedicated field. Concatenate multiple such items with "; ".
- data_source: MUST be exactly one of "leads_on_demand", "meridian_tower", "eden_park",
  "varah_swamy", "sarjapur_plots", or null if none match confidently. Do not guess — use
  null rather than picking an unlikely value.
- possession_time: property possession time, if this is a real-estate lead export.
- description: any additional free-text description of the lead that doesn't belong in
  crm_note.

RULES:
1. If a row has multiple email addresses: use the first as "email", append the rest to
   crm_note (e.g. "Additional emails: a@x.com, b@x.com").
2. If a row has multiple phone numbers: use the first as mobile_without_country_code,
   append the rest to crm_note (e.g. "Additional numbers: 9876543210").
3. Every string value you output must be a single line — replace any literal newline
   inside a value with the two characters "\\n" (backslash-n) so it stays valid as one
   JSON string / one eventual CSV row. Never emit a raw line break inside a field value.
4. SKIP RULE: if a row has neither a usable email NOR a usable mobile number, set
   "skipped": true and put a short reason in "skipReason" (e.g. "no email or mobile
   number present"). Do not fabricate contact info to avoid skipping.
5. For every row you are given, return exactly one output object, and set its
   "sourceIndex" to the row's original "index" value, unchanged. Do not skip emitting an
   object for a row — even skipped rows must appear in the output with skipped: true.
6. Any field you cannot determine confidently should be null, never a guess presented as
   fact.
7. Output ONLY the JSON array described by the response schema. No prose, no markdown
   fences.`;

interface IndexedRow {
  index: number;
  row: RawCsvRecord;
}

function buildBatchPrompt(batch: IndexedRow[]): string {
  const payload = batch.map((r) => ({ index: r.index, data: r.row }));
  return `Map the following ${batch.length} CSV row(s) into GrowEasy CRM records:\n\n${JSON.stringify(
    payload,
    null,
    2
  )}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /429|500|503|rate.?limit|timeout|ECONNRESET|fetch failed/i.test(message);
}

// don't trust the model's enum/skip choices blindly, re-check them here
export function normalizeExtractedRow(raw: Record<string, unknown>): ExtractedRow {
  const sourceIndex = typeof raw.sourceIndex === "number" ? raw.sourceIndex : -1;

  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const email = str(raw.email);
  const mobile = str(raw.mobile_without_country_code);

  const crmStatusRaw = str(raw.crm_status) ?? "";
  const crmStatus = (CRM_STATUS_VALUES as readonly string[]).includes(crmStatusRaw)
    ? (crmStatusRaw as CrmRecord["crm_status"])
    : "";

  const dataSourceRaw = str(raw.data_source) ?? "";
  const dataSource = (DATA_SOURCE_VALUES as readonly string[]).includes(dataSourceRaw)
    ? (dataSourceRaw as CrmRecord["data_source"])
    : "";

  const skippedByModel = raw.skipped === true;
  const skippedByRule = !email && !mobile;
  const skipped = skippedByModel || skippedByRule;

  if (skipped) {
    return {
      sourceIndex,
      skipped: true,
      skipReason:
        str(raw.skipReason) ?? (skippedByRule ? "Row has neither an email nor a mobile number." : "Skipped by AI."),
      record: null,
    };
  }

  const record: CrmRecord = {
    created_at: str(raw.created_at),
    name: str(raw.name),
    email,
    country_code: str(raw.country_code),
    mobile_without_country_code: mobile,
    company: str(raw.company),
    city: str(raw.city),
    state: str(raw.state),
    country: str(raw.country),
    lead_owner: str(raw.lead_owner),
    crm_status: crmStatus,
    crm_note: str(raw.crm_note),
    data_source: dataSource,
    possession_time: str(raw.possession_time),
    description: str(raw.description),
  };

  return { sourceIndex, skipped: false, skipReason: null, record };
}

export class AiExtractionError extends Error {}

export async function extractBatch(indexedRows: IndexedRow[]): Promise<ExtractedRow[]> {
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTIONS,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.1,
    },
  });

  const prompt = buildBatchPrompt(indexedRows);
  let lastError: unknown;

  for (let attempt = 1; attempt <= env.AI_MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text) as Array<Record<string, unknown>>;

      const normalized = parsed.map((raw) => normalizeExtractedRow(raw));

      // model occasionally drops a row - patch in the gaps as skipped
      const seen = new Set(normalized.map((r) => r.sourceIndex));
      for (const { index } of indexedRows) {
        if (!seen.has(index)) {
          normalized.push({
            sourceIndex: index,
            skipped: true,
            skipReason: "Model did not return a result for this row.",
            record: null,
          });
        }
      }

      return normalized.sort((a, b) => a.sourceIndex - b.sourceIndex);
    } catch (err) {
      lastError = err;
      if (attempt < env.AI_MAX_RETRIES && isTransientError(err)) {
        await sleep(2 ** attempt * 500);
        continue;
      }
      break;
    }
  }

  // full detail (model names, endpoint URLs, provider error text) stays in the
  // server log only - clients just get a generic reason, not our AI vendor's
  // internals
  console.error("Gemini batch extraction failed:", lastError);
  throw new AiExtractionError("AI extraction failed for this batch. Please try again.");
}

export function chunkIntoBatches(rows: RawCsvRecord[], batchSize: number): IndexedRow[][] {
  const indexed: IndexedRow[] = rows.map((row, index) => ({ index, row }));
  const batches: IndexedRow[][] = [];
  for (let i = 0; i < indexed.length; i += batchSize) {
    batches.push(indexed.slice(i, i + batchSize));
  }
  return batches;
}
