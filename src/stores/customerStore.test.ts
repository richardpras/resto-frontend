import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListCustomers = vi.fn();
const mockGetCustomerById = vi.fn();

vi.mock("@/lib/api-integration/crmEndpoints", () => ({
  listCustomers: (...args: unknown[]) => mockListCustomers(...args),
  getCustomerById: (...args: unknown[]) => mockGetCustomerById(...args),
}));

import { useCustomerStore } from "./customerStore";

describe("customerStore orchestration", () => {
  beforeEach(() => {
    mockListCustomers.mockReset();
    mockGetCustomerById.mockReset();
    useCustomerStore.getState().reset();
  });

  it("handles pagination meta and outlet-scoped refresh", async () => {
    mockListCustomers.mockResolvedValue({
      rows: [
        { id: "c-1", outlet_id: 10, code: "CUST-1", name: "Ari", points_balance: 150 },
        { id: "c-2", outlet_id: 10, code: "CUST-2", name: "Mira", points_balance: 90 },
      ],
      meta: { current_page: 2, per_page: 2, total: 8, last_page: 4 },
    });

    await useCustomerStore.getState().refreshForOutlet(10);
    const state = useCustomerStore.getState();

    expect(state.lifecycle).toBe("success");
    expect(state.activeOutletId).toBe(10);
    expect(state.customers).toHaveLength(2);
    expect(state.pagination.currentPage).toBe(2);
    expect(state.pagination.lastPage).toBe(4);
    expect(mockListCustomers).toHaveBeenCalledWith(expect.objectContaining({ outletId: 10, page: 1 }));
  });
});
