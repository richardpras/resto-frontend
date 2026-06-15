import { describe, expect, it } from "vitest";
import { detectBrowserLocale, normalizeAppLocale } from "./localeResolver";

describe("normalizeAppLocale", () => {
  it("maps Indonesian variants to id", () => {
    expect(normalizeAppLocale("id")).toBe("id");
    expect(normalizeAppLocale("id-ID")).toBe("id");
    expect(normalizeAppLocale("ID")).toBe("id");
  });

  it("falls back to en for other locales", () => {
    expect(normalizeAppLocale("en-US")).toBe("en");
    expect(normalizeAppLocale("fr")).toBe("en");
    expect(normalizeAppLocale("")).toBe("en");
    expect(normalizeAppLocale(undefined)).toBe("en");
  });
});

describe("detectBrowserLocale", () => {
  it("returns id when Indonesian is preferred", () => {
    expect(detectBrowserLocale(["id-ID", "en-US"])).toBe("id");
    expect(detectBrowserLocale(["en-US", "id"])).toBe("id");
  });

  it("returns en when no Indonesian locale is listed", () => {
    expect(detectBrowserLocale(["en-US", "fr-FR"])).toBe("en");
    expect(detectBrowserLocale([])).toBe("en");
  });
});
