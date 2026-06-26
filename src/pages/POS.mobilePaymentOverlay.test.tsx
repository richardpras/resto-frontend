// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { MOBILE_MAX, TABLET_MAX, DESKTOP_MIN } from "@/hooks/useBreakpoint";

describe("useBreakpoint constants", () => {
  it("defines mobile/tablet/desktop width gates", () => {
    expect(MOBILE_MAX).toBe(767);
    expect(TABLET_MAX).toBe(1023);
    expect(DESKTOP_MIN).toBe(1024);
  });
});

describe("POS compact cart breakpoint classes", () => {
  it("uses lg gate for desktop cart sidebar in POS source", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const posSource = readFileSync(resolve(__dirname, "POS.tsx"), "utf-8");
    expect(posSource).toContain("hidden lg:flex");
    expect(posSource).toContain("lg:hidden fixed bottom-0");
    expect(posSource).toContain('data-testid="pos-payment-overlay"');
    expect(posSource).toContain("setMobileCartOpen(false)");
  });
});
