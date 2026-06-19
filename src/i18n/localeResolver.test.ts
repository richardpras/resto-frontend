import { describe, expect, it, beforeEach } from "vitest";
import {
  appendGuestLangToHref,
  detectBrowserLocale,
  GUEST_LOCALE_STORAGE_KEY,
  normalizeAppLocale,
  readGuestLocaleFromStorage,
  resolveGuestLocale,
  writeGuestLocaleToStorage,
} from "./localeResolver";

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

describe("resolveGuestLocale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("prefers URL lang over storage and browser", () => {
    writeGuestLocaleToStorage("id");
    const params = new URLSearchParams("lang=en");
    expect(resolveGuestLocale(params)).toBe("en");
  });

  it("uses storage when URL lang is absent", () => {
    writeGuestLocaleToStorage("id");
    expect(resolveGuestLocale(new URLSearchParams())).toBe("id");
  });

  it("falls back to browser when URL and storage are absent", () => {
    expect(resolveGuestLocale(new URLSearchParams())).toBe(detectBrowserLocale());
  });
});

describe("appendGuestLangToHref", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appends lang from search params", () => {
    const params = new URLSearchParams("lang=id");
    expect(appendGuestLangToHref("/qr/table-1", params)).toBe("/qr/table-1?lang=id");
  });

  it("appends stored guest locale when query is missing", () => {
    writeGuestLocaleToStorage("en");
    expect(appendGuestLangToHref("/qr/order/ABC", new URLSearchParams())).toBe("/qr/order/ABC?lang=en");
  });

  it("does not duplicate lang query", () => {
    const params = new URLSearchParams("lang=id");
    expect(appendGuestLangToHref("/qr/table-1?lang=id", params)).toBe("/qr/table-1?lang=id");
  });
});

describe("guest locale storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads and writes guest locale", () => {
    expect(readGuestLocaleFromStorage()).toBeNull();
    writeGuestLocaleToStorage("id");
    expect(localStorage.getItem(GUEST_LOCALE_STORAGE_KEY)).toBe("id");
    expect(readGuestLocaleFromStorage()).toBe("id");
  });
});
