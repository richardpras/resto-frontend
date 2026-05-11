import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const dashboardSource = readFileSync(path.resolve(__dirname, "Dashboard.tsx"), "utf-8");

describe("Dashboard loading and best-seller sanity", () => {
  it("uses initial or outlet-switch loading flags for skeletons", () => {
    expect(dashboardSource).toMatch(/const showDashboardSkeleton = summaryInitialLoading \|\| summarySwitchingOutlet/);
    expect(dashboardSource).toMatch(/const showMonitoringSkeleton = initialLoading \|\| switchingOutlet/);
  });

  it("renders cross-outlet bestseller section", () => {
    expect(dashboardSource).toMatch(/Best Seller di Outlet Lain/);
    expect(dashboardSource).toMatch(/summary\.bestSellerOtherOutlets\.map/);
  });
});

