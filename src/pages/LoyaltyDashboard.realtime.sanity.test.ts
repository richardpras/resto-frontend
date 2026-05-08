import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const loyaltyDashboardSource = readFileSync(path.resolve(__dirname, "LoyaltyDashboard.tsx"), "utf-8");

describe("LoyaltyDashboard realtime compatibility sanity", () => {
  it("starts realtime and polling fallback for loyalty and CRM stores", () => {
    expect(loyaltyDashboardSource).toMatch(/startLoyaltyRealtime\(\)/);
    expect(loyaltyDashboardSource).toMatch(/startLoyaltyPolling\(12000\)/);
    expect(loyaltyDashboardSource).toMatch(/startCrmRealtime\(\)/);
    expect(loyaltyDashboardSource).toMatch(/startCrmPolling\(15000\)/);
  });

  it("cleans realtime and polling subscriptions on unmount", () => {
    expect(loyaltyDashboardSource).toMatch(/stopCrmPolling\(\)/);
    expect(loyaltyDashboardSource).toMatch(/stopCrmRealtime\(\)/);
    expect(loyaltyDashboardSource).toMatch(/stopLoyaltyPolling\(\)/);
    expect(loyaltyDashboardSource).toMatch(/stopLoyaltyRealtime\(\)/);
  });
});
