export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

// keyed by whatever the CSV's original column headers were
export type RawCsvRecord = Record<string, string>;

export interface CrmRecord {
  created_at: string | null;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: CrmStatus | "" | null;
  crm_note: string | null;
  data_source: DataSource | "" | null;
  possession_time: string | null;
  description: string | null;
}

export interface ExtractedRow {
  sourceIndex: number;
  skipped: boolean;
  skipReason: string | null;
  record: CrmRecord | null;
}

export interface ImportSummary {
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  imported: CrmRecord[];
  skipped: Array<{ row: RawCsvRecord; reason: string }>;
}

// events written to the NDJSON response stream, one per line
export type ImportStreamEvent =
  | { type: "meta"; totalRows: number; totalBatches: number; batchSize: number }
  | { type: "progress"; batchIndex: number; totalBatches: number; processedRows: number; totalRows: number }
  | { type: "batch_error"; batchIndex: number; message: string }
  | { type: "done"; summary: ImportSummary }
  | { type: "error"; message: string };
