// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import MenuCostList from "./MenuCostList";

const catalog = [
  {
    menuItemId: "1",
    menuItemName: "Burger",
    category: "Mains",
    sellingPrice: 100000,
    foodCost: 40000,
    contributionMargin: 60000,
    marginPercent: 60,
    classification: "HIGH",
    lastUpdated: "2026-01-01T00:00:00.000Z",
  },
  {
    menuItemId: "2",
    menuItemName: "Salad",
    category: "Sides",
    sellingPrice: 50000,
    foodCost: 30000,
    contributionMargin: 20000,
    marginPercent: 40,
    classification: "MEDIUM",
    lastUpdated: null,
  },
];

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number | null }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

vi.mock("@/hooks/menu/useMenuCostCatalog", () => ({
  useMenuCostCatalog: () => ({ data: catalog, isLoading: false }),
  filterMenuCostRows: (rows: typeof catalog, search: string, category: string) =>
    rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (search && !r.menuItemName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
  sortMenuCostRows: (rows: typeof catalog) => rows,
  paginateRows: (rows: typeof catalog, page: number, perPage: number) => ({
    rows: rows.slice((page - 1) * perPage, page * perPage),
    total: rows.length,
    lastPage: Math.max(1, Math.ceil(rows.length / perPage)),
  }),
}));

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MenuCostList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MenuCostList", () => {
  it("renders rows and filters by search", () => {
    renderPage();
    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("Salad")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search menu items"), { target: { value: "salad" } });
    expect(screen.queryByText("Burger")).not.toBeInTheDocument();
    expect(screen.getByText("Salad")).toBeInTheDocument();
  });
});
