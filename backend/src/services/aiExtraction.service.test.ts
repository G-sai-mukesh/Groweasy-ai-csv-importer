import { describe, it, expect } from "vitest";
import { normalizeExtractedRow, isTransientError } from "./aiExtraction.service";

describe("normalizeExtractedRow", () => {
  it("builds a full record when contact info and valid enums are present", () => {
    const result = normalizeExtractedRow({
      sourceIndex: 0,
      skipped: false,
      name: "John Doe",
      email: " john@example.com ",
      mobile_without_country_code: "9876543210",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      data_source: "eden_park",
    });

    expect(result.skipped).toBe(false);
    expect(result.record).toMatchObject({
      name: "John Doe",
      email: "john@example.com",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      data_source: "eden_park",
    });
  });

  it("forces skipped=true when neither email nor mobile is present, regardless of the model's own flag", () => {
    const result = normalizeExtractedRow({
      sourceIndex: 2,
      skipped: false, // model got it wrong; server-side rule must still catch it
      name: "No Contact",
    });

    expect(result.skipped).toBe(true);
    expect(result.record).toBeNull();
    expect(result.skipReason).toMatch(/neither an email nor a mobile/i);
  });

  it("falls back to an empty string for a crm_status value outside the allowed enum", () => {
    const result = normalizeExtractedRow({
      sourceIndex: 0,
      skipped: false,
      email: "a@b.com",
      crm_status: "SOMETHING_MADE_UP",
    });

    expect(result.record?.crm_status).toBe("");
  });

  it("falls back to an empty string for a data_source value outside the allowed enum", () => {
    const result = normalizeExtractedRow({
      sourceIndex: 0,
      skipped: false,
      email: "a@b.com",
      data_source: "not_a_real_project",
    });

    expect(result.record?.data_source).toBe("");
  });

  it("treats blank strings as null rather than empty content", () => {
    const result = normalizeExtractedRow({
      sourceIndex: 0,
      skipped: false,
      email: "a@b.com",
      company: "   ",
    });

    expect(result.record?.company).toBeNull();
  });

  it("respects an explicit skipped:true from the model even if contact info exists", () => {
    const result = normalizeExtractedRow({
      sourceIndex: 0,
      skipped: true,
      skipReason: "duplicate row",
      email: "a@b.com",
      mobile_without_country_code: "9876543210",
    });

    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("duplicate row");
  });
});

describe("isTransientError", () => {
  it("treats rate limit and server errors as transient", () => {
    expect(isTransientError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isTransientError(new Error("503 Service Unavailable"))).toBe(true);
    expect(isTransientError(new Error("fetch failed"))).toBe(true);
  });

  it("treats a 400 (bad request / invalid key) as non-transient", () => {
    expect(isTransientError(new Error("400 Bad Request: API key not valid"))).toBe(false);
  });
});
