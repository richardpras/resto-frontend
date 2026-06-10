// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ExecutiveSalesReport from "@/pages/ExecutiveSalesReport";

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (s: { activeOutletId: number }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: {
    ACCOUNTING: "accounting.manage",
    REPORTS: "reports.view",
  },
  useAuthStore: (selector: (s: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: (p: string) => p === "reports.view" }),
}));

vi.mock("@/lib/api-integration/reportingEndpoints", () => ({
  fetchExecutiveSalesReport: vi.fn(),
}));

import { fetchExecutiveSalesReport } from "@/lib/api-integration/reportingEndpoints";

const mockReport = {
  summary: {
    grossSales: 500000,
    promotionDiscount: 0,
    voucherDiscount: 25000,
    loyaltyDiscount: 0,
    manualDiscount: 0,
    giftCardRedemption: 50000,
    totalDiscounts: 25000,
    netSales: 475000,
    refundAmount: 10000,
    refundCount: 1,
    finalRevenue: 465000,
    orderCount: 12,
    averageOrderValue: 39583.33,
    giftCardSalesSettled: 50000,
    storeCreditSettled: 0,
  },
  trends: [{ date: "2026-06-01", grossSales: 500000, netSales: 475000, refunds: 10000 }],
  channels: [{ channel: "pos", sales: 400000, orders: 10, averageOrderValue: 40000 }],
  payments: [
    { method: "cash", amount: 300000, percentage: 60, transactionCount: 8 },
    { method: "gift_card", amount: 50000, percentage: 10, transactionCount: 2 },
  ],
  discounts: [
    { type: "voucher", amount: 25000 },
    { type: "gift_card", amount: 50000, informational: true },
  ],
  topProducts: [
    { productId: "10", productName: "Burger", quantity: 25, grossSales: 250000, netSales: 240000 },
  ],
  filters: {
    outletIds: [1],
    startDate: "2026-06-01",
    endDate: "2026-06-10",
    comparisonPeriod: null,
  },
};

describe("ExecutiveSalesReport page", () => {
  beforeEach(() => {
    vi.mocked(fetchExecutiveSalesReport).mockResolvedValue(mockReport);
  });

  it("renders KPI cards", async () => {
    render(<ExecutiveSalesReport />);
    await waitFor(() => {
      expect(screen.getByText("Gross Sales")).toBeTruthy();
      expect(screen.getByText("Net Sales")).toBeTruthy();
      expect(screen.getByText("Final Revenue")).toBeTruthy();
      expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    });
  });

  it("renders trends section", async () => {
    render(<ExecutiveSalesReport />);
    await waitFor(() => {
      expect(screen.getByText("Sales trend")).toBeTruthy();
    });
  });

  it("renders payment mix section", async () => {
    render(<ExecutiveSalesReport />);
    await waitFor(() => {
      expect(screen.getByText("Payment mix")).toBeTruthy();
    });
  });

  it("renders top products table", async () => {
    render(<ExecutiveSalesReport />);
    await waitFor(() => {
      expect(screen.getByText("Top products")).toBeTruthy();
      expect(screen.getByText("Burger")).toBeTruthy();
    });
  });
});
