import { describe, it, expect } from "vitest";
import { parseCsvBuffer, CsvParseError } from "./csvParser.service";

describe("parseCsvBuffer", () => {
  it("parses a well-formed CSV into keyed records", () => {
    const csv = "name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com\n";
    const rows = parseCsvBuffer(Buffer.from(csv));
    expect(rows).toEqual([
      { name: "John Doe", email: "john@example.com" },
      { name: "Jane Doe", email: "jane@example.com" },
    ]);
  });

  it("trims header and cell whitespace", () => {
    const csv = " Name , Email \n John Doe , john@example.com \n";
    const rows = parseCsvBuffer(Buffer.from(csv));
    expect(rows[0]).toEqual({ Name: "John Doe", Email: "john@example.com" });
  });

  it("works with arbitrary column names, not a fixed schema", () => {
    const csv = "Lead Full Name,Contact Number,Campaign Source\nAmit,9876543210,Facebook Ads\n";
    const rows = parseCsvBuffer(Buffer.from(csv));
    expect(rows[0]).toEqual({
      "Lead Full Name": "Amit",
      "Contact Number": "9876543210",
      "Campaign Source": "Facebook Ads",
    });
  });

  it("drops fully-empty rows", () => {
    const csv = "name,email\nJohn,john@example.com\n,\nJane,jane@example.com\n";
    const rows = parseCsvBuffer(Buffer.from(csv));
    expect(rows).toHaveLength(2);
  });

  it("throws CsvParseError for a header-only CSV with no data rows", () => {
    expect(() => parseCsvBuffer(Buffer.from("name,email\n"))).toThrow(CsvParseError);
  });

  it("throws CsvParseError for structurally invalid CSV", () => {
    expect(() => parseCsvBuffer(Buffer.from('"unterminated quote,val'))).toThrow(CsvParseError);
  });

  it("rejects a file with more rows than MAX_ROWS, even if it's under the size limit", () => {
    // a small file can still pack in far more rows than we want to fan out to the AI
    const rows = Array.from({ length: 5001 }, (_, i) => `row${i},x@example.com`).join("\n");
    const csv = `name,email\n${rows}\n`;
    expect(() => parseCsvBuffer(Buffer.from(csv))).toThrow(/exceeds the 5000 row limit/);
  });
});
