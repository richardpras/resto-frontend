import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInventoryStore } from "./inventoryStore";

const mockListInventoryWithMeta = vi.fn();
const mockListStockMovementsWithMeta = vi.fn();
const mockCreateInventoryItem = vi.fn();
const mockUpdateInventoryItem = vi.fn();
const mockDeleteInventoryItem = vi.fn();

vi.mock("@/lib/api-integration/inventoryEndpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/inventoryEndpoints")>(
      "@/lib/api-integration/inventoryEndpoints",
    );
  return {
    ...actual,
    listInventoryWithMeta: (...args: unknown[]) => mockListInventoryWithMeta(...args),
    listStockMovementsWithMeta: (...args: unknown[]) => mockListStockMovementsWithMeta(...args),
    createInventoryItem: (...args: unknown[]) => mockCreateInventoryItem(...args),
    updateInventoryItem: (...args: unknown[]) => mockUpdateInventoryItem(...args),
    deleteInventoryItem: (...args: unknown[]) => mockDeleteInventoryItem(...args),
  };
});

function resetState() {
  useInventoryStore.setState({
    ingredients: [],
    stockMovements: [],
    recipes: [],
    blockOnInsufficient: false,
    isLoading: false,
    isSubmitting: false,
    error: null,
    pagination: null,
    movementPagination: null,
    lastSyncAt: null,
    lastListParams: null,
    lastMovementListParams: null,
  });
}

describe("inventoryStore async lifecycle", () => {
  beforeEach(() => {
    resetState();
    mockListInventoryWithMeta.mockReset();
    mockListStockMovementsWithMeta.mockReset();
    mockCreateInventoryItem.mockReset();
    mockUpdateInventoryItem.mockReset();
    mockDeleteInventoryItem.mockReset();
  });

  it("fetches inventory with outlet scope and revalidates with last params", async () => {
    mockListInventoryWithMeta.mockResolvedValueOnce({
      items: [{ id: "1", name: "Rice", type: "ingredient", stock: 10, min: 3, unit: "kg" }],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });

    await useInventoryStore.getState().fetchInventory({ tenantId: 1, outletId: 2, perPage: 20 });
    expect(mockListInventoryWithMeta).toHaveBeenCalledWith({ tenantId: 1, outletId: 2, perPage: 20 });
    expect(useInventoryStore.getState().ingredients[0].name).toBe("Rice");

    mockListInventoryWithMeta.mockResolvedValueOnce({
      items: [{ id: "2", name: "Oil", type: "ingredient", stock: 7, min: 2, unit: "L" }],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });
    await useInventoryStore.getState().revalidateInventory();

    expect(mockListInventoryWithMeta).toHaveBeenLastCalledWith({ tenantId: 1, outletId: 2, perPage: 20 });
    expect(useInventoryStore.getState().ingredients[0].name).toBe("Oil");
  });

  it("loads movement ledger and stores pagination + sync markers", async () => {
    mockListStockMovementsWithMeta.mockResolvedValueOnce({
      movements: [
        {
          id: 99,
          inventory_item_id: 1,
          inventory_item_name: "Rice",
          outlet_id: 2,
          type: "purchase",
          quantity: 5,
          source_type: "grn",
          source_id: "GRN-1",
          created_at: "2026-05-07T08:00:00.000Z",
        },
      ],
      meta: { currentPage: 1, perPage: 50, total: 1, lastPage: 1 },
    });

    await useInventoryStore.getState().fetchStockMovements({ tenantId: 1, outletId: 2, perPage: 50 });

    const state = useInventoryStore.getState();
    expect(state.stockMovements[0].inventoryItemName).toBe("Rice");
    expect(state.movementPagination?.perPage).toBe(50);
    expect(state.lastSyncAt).not.toBeNull();
  });
});
