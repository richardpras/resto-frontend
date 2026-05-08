import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const dashboardPage = readFileSync(path.resolve(__dirname, "Dashboard.tsx"), "utf-8");
const printerPage = readFileSync(path.resolve(__dirname, "settings/PrinterSettings.tsx"), "utf-8");

describe("Dashboard + printer page store boundary", () => {
  it("does not import operational or payment/order APIs directly in pages", () => {
    [dashboardPage, printerPage].forEach((source) => {
      expect(source).not.toMatch(/from\s+["']@\/lib\/api["']/);
      expect(source).not.toMatch(/from\s+["']@\/lib\/api-integration\/.*(payment|order|printer|monitor).*/);
    });
  });

  it("wires dashboard and printer page through store actions", () => {
    expect(dashboardPage).toMatch(/useOperationalDashboardStore\(\(s\)\s*=>\s*s\.startMonitoring\)/);
    expect(dashboardPage).toMatch(/useOperationalDashboardStore\(\(s\)\s*=>\s*s\.stopMonitoring\)/);
    expect(printerPage).toMatch(/usePrinterManagementStore\(\(s\)\s*=>\s*s\.fetchQueueStatus\)/);
    expect(printerPage).toMatch(/usePrinterManagementStore\(\(s\)\s*=>\s*s\.saveProfile\)/);
    expect(printerPage).toMatch(/usePrinterManagementStore\(\(s\)\s*=>\s*s\.retryFailedJob\)/);
  });
});
