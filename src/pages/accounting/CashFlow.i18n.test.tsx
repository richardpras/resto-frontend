// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import i18n from "@/i18n";
import CashFlow from "./CashFlow";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: { user: { permissions: string[] } }) => unknown) =>
    selector({ user: { permissions: ["accounting.manage", "reports.view"] } }),
}));

vi.mock("@/domain/permissionGates", () => ({
  canViewFinancialStatements: () => true,
}));

vi.mock("@/stores/accountingStore", () => ({
  useAccountingStore: (selector: (s: { outletOptions: { id: number; name: string }[] }) => unknown) =>
    selector({ outletOptions: [{ id: 1, name: "Outlet A" }] }),
  formatIDR: (n: number) => `Rp ${n}`,
}));

vi.mock("@/lib/api-integration/accountingEndpoints", () => ({
  getCashFlowReport: vi.fn().mockResolvedValue({
    from: "2026-06-01",
    to: "2026-06-22",
    operating: { netProfit: 1000000, total: 1000000 },
    investing: { total: 0 },
    financing: { total: 0 },
    netCashChange: 1000000,
  }),
}));

describe("CashFlow i18n", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("id");
  });

  it("renders cash flow line labels in Indonesian", async () => {
    render(<CashFlow />);
    expect(await screen.findByText("Laba Bersih")).toBeTruthy();
    expect(screen.getByText("Laporan Arus Kas")).toBeTruthy();
    expect(screen.queryByText("Net Profit")).toBeNull();
  });
});
