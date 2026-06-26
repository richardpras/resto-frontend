import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HOOK_PATH = resolve(__dirname, "useBreakpoint.ts");
const MOBILE_HOOK_PATH = resolve(__dirname, "use-mobile.tsx");

describe("useBreakpoint", () => {
  it("exports compact viewport helpers for tablet drawer", () => {
    const source = readFileSync(HOOK_PATH, "utf-8");
    expect(source).toContain("useIsCompactViewport");
    expect(source).toContain('"tablet"');
  });

  it("sidebar drawer hook uses 1024px gate", () => {
    const source = readFileSync(MOBILE_HOOK_PATH, "utf-8");
    expect(source).toContain("useIsSidebarDrawer");
    expect(source).toContain("1024");
  });
});
