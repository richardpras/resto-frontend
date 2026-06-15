import "@testing-library/jest-dom";
import "@/i18n";
import i18n from "@/i18n";
import { beforeEach } from "vitest";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
