// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Inventory from "./Inventory";

const mockFetchInventory = vi.fn();
const mockFetchStockMovements = vi.fn();
const mockCreateItemRemote = vi.fn();
const mockUpdateItemRemote = vi.fn();
const mockDeleteItemRemote = vi.fn();

let activeOutletId = 2;
const storeState = {
  ingredients: [
    { id: "1", name: "Rice", type: "ingredient", stock: 10, min: 5, unit: "kg" },
  ],
  stockMovements: [
    {
      id: "m-1",
      inventoryItemId: "1",
      inventoryItemName: "Rice",
      outletId: 2,
      type: "adjustment",
      quantity: 2,
      sourceType: "manual",
      sourceId: null,
      createdAt: "2026-05-07T08:00:00.000Z",
    },
  ],
  isLoading: false,
  fetchInventory: mockFetchInventory,
  fetchStockMovements: mockFetchStockMovements,
  createItemRemote: mockCreateItemRemote,
  updateItemRemote: mockUpdateItemRemote,
  deleteItemRemote: mockDeleteItemRemote,
};

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number | null }) => unknown) =>
    selector({ activeOutletId }),
}));

vi.mock("@/stores/inventoryStore", () => ({
  useInventoryStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock("@/components/InventoryFormModal", () => ({
  default: () => null,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("Inventory page store orchestration", () => {
  beforeEach(() => {
    activeOutletId = 2;
    mockFetchInventory.mockReset();
    mockFetchStockMovements.mockReset();
    mockCreateItemRemote.mockReset();
    mockUpdateItemRemote.mockReset();
    mockDeleteItemRemote.mockReset();
  });

  it("refreshes inventory + movement ledger with outlet scope changes", async () => {
    const { rerender } = render(<Inventory />);

    await waitFor(() => {
      expect(mockFetchInventory).toHaveBeenCalledWith({ tenantId: 1, outletId: 2, perPage: 200 });
      expect(mockFetchStockMovements).toHaveBeenCalledWith({ tenantId: 1, outletId: 2, perPage: 200 });
    });

    activeOutletId = 7;
    rerender(<Inventory />);

    await waitFor(() => {
      expect(mockFetchInventory).toHaveBeenLastCalledWith({ tenantId: 1, outletId: 7, perPage: 200 });
      expect(mockFetchStockMovements).toHaveBeenLastCalledWith({ tenantId: 1, outletId: 7, perPage: 200 });
    });
  });

  it("renders movement ledger rows from store data flow", () => {
    render(<Inventory />);
    expect(screen.getByText("Movement Ledger")).toBeInTheDocument();
    expect(screen.getAllByText("Rice").length).toBeGreaterThan(0);
    expect(screen.getByText("adjustment")).toBeInTheDocument();
    expect(screen.getByText("manual")).toBeInTheDocument();
  });
});
