// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import MenuIntelligenceDashboard from "./MenuIntelligenceDashboard";

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number | null }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => false }),
}));

vi.mock("@/hooks/menu/useMenuIntelligenceDashboard", () => ({
  useMenuIntelligenceDashboard: () => ({
    summary: {
      kpis: {
        revenue: 1000000,
        foodCostPercent: 32,
        averageMarginPercent: 55,
        forecastRevenue: 1200000,
        forecastMargin: 600000,
      },
      inventory: { inventoryValue: 5000000, deadStockCount: 0, criticalStockRisks: 0 },
      health: {
        score: 88,
        band: "excellent",
        penalties: {
          criticalAlerts: 0,
          dogItems: 1,
          criticalStockRisks: 0,
          foodCostAboveThreshold: false,
          marginErosionDetected: false,
        },
      },
    },
    matrix: {
      items: [
        {
          menuItemId: "1",
          menuItemName: "Burger",
          quantitySold: 5,
          popularityPercent: 20,
          contributionMargin: 15000,
          marginPercent: 40,
          classification: "STAR",
        },
      ],
      summary: { STAR: 1 },
      analytics: { topStars: [], highestMargin: [], highestPopularity: [] },
      benchmarks: { averagePopularityPercent: 10, averageContributionMargin: 10000 },
    },
    snapshots: [],
    executive: { salesTrend: [], totalRevenue: 0, averageFoodCostPercent: 0, averageMarginPercent: 0, inventoryValue: 0 },
    foodCostTrend: [],
    marginTrend: [],
    inventory: { inventoryValue: 5000000, deadStock: [] },
    priceOpps: [],
    bundleOpps: [],
    ingredientOpps: [],
    yieldOpps: [],
    openAlerts: [],
    criticalAlerts: [],
    resolvedAlerts: [],
    demandForecast: { forecastDate: "2026-06-10", items: [] },
    revenueForecast: { forecastDate: "2026-06-10", totals: { predictedRevenue: 0, predictedMargin: 0 }, items: [] },
    productionForecast: { items: [] },
    stockRisk: { risks: [] },
    isLoading: false,
    isRefetching: false,
    refetchAlerts: vi.fn(),
  }),
  useInvalidateMenuDashboard: () => vi.fn(),
}));

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MenuIntelligenceDashboard />
    </QueryClientProvider>,
  );
}

describe("MenuIntelligenceDashboard", () => {
  it("renders executive sections and KPI values", () => {
    renderPage();
    expect(screen.getByText("Menu Intelligence Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Executive KPIs")).toBeInTheDocument();
    expect(screen.getByText("Menu Engineering")).toBeInTheDocument();
    expect(screen.getByText("Alert Center")).toBeInTheDocument();
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });
});
