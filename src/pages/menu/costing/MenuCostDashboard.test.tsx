// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import MenuCostDashboard from "./MenuCostDashboard";

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number | null }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

vi.mock("@/hooks/menu/useMenuCostCatalog", () => ({
  useMenuCostCatalog: () => ({
    data: [
      {
        menuItemId: "1",
        menuItemName: "Burger",
        category: "Mains",
        sellingPrice: 100000,
        foodCost: 50000,
        contributionMargin: 50000,
        marginPercent: 50,
        classification: "HIGH",
        lastUpdated: null,
      },
    ],
    isLoading: false,
  }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MenuCostDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MenuCostDashboard", () => {
  it("renders dashboard widgets with catalog data", () => {
    renderPage();
    expect(screen.getByText("Menu Cost Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total Menu Items")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("Burger").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /browse items/i })).toBeInTheDocument();
  });
});
