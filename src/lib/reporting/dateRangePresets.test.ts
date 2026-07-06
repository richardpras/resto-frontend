import { describe, expect, it } from "vitest";
import {
  createReportDateRange,
  isValidDateRange,
  parseRangeFromUrl,
  resolvePresetRange,
  writeRangeToUrl,
} from "./dateRangePresets";

describe("dateRangePresets", () => {
  const ref = new Date("2026-06-22T12:00:00");

  it("resolves today as single day", () => {
    expect(resolvePresetRange("today", ref)).toEqual({
      startDate: "2026-06-22",
      endDate: "2026-06-22",
    });
  });

  it("resolves 7d inclusive", () => {
    expect(resolvePresetRange("7d", ref)).toEqual({
      startDate: "2026-06-16",
      endDate: "2026-06-22",
    });
  });

  it("resolves 14d and 30d", () => {
    expect(resolvePresetRange("14d", ref).startDate).toBe("2026-06-09");
    expect(resolvePresetRange("30d", ref).startDate).toBe("2026-05-24");
  });

  it("validates custom ranges", () => {
    expect(isValidDateRange("2026-06-01", "2026-06-22")).toBe(true);
    expect(isValidDateRange("2026-06-22", "2026-06-01")).toBe(false);
  });

  it("parses and writes URL params", () => {
    const parsed = parseRangeFromUrl(new URLSearchParams("range=7d"));
    expect(parsed?.preset).toBe("7d");

    const custom = parseRangeFromUrl(new URLSearchParams("range=custom&from=2026-06-01&to=2026-06-10"));
    expect(custom).toEqual({
      preset: "custom",
      startDate: "2026-06-01",
      endDate: "2026-06-10",
    });

    const written = writeRangeToUrl(
      new URLSearchParams("tab=analytics"),
      createReportDateRange("custom", { startDate: "2026-06-01", endDate: "2026-06-10" }),
    );
    expect(written.get("range")).toBe("custom");
    expect(written.get("from")).toBe("2026-06-01");
    expect(written.get("to")).toBe("2026-06-10");
    expect(written.get("tab")).toBe("analytics");
  });
});
