import { describe, expect, it } from "vitest";
import { accountExportFilename } from "./export-file";

describe("account export file", () => {
  it("names the export by ISO date so downloads sort chronologically", () => {
    expect(accountExportFilename(new Date("2026-08-28T22:13:00Z"))).toBe("unbindall-export-2026-08-28.json");
  });
});
