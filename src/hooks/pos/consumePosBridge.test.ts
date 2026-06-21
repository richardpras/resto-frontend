import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumePosBridge, consumeOutletCartResetSuppression } from "./consumePosBridge";
import { useQrOrderPosBridgeStore } from "@/stores/qrOrderPosBridgeStore";
import { useReservationPosBridgeStore } from "@/stores/reservationPosBridgeStore";
import { useOutletStore } from "@/stores/outletStore";

vi.mock("@/components/reservations/applyReservationPosPayload", () => ({
  applyReservationPosPayload: vi.fn().mockResolvedValue(undefined),
}));

const mockFetchOrderRemote = vi.fn();
const mockFetchMembers = vi.fn().mockResolvedValue(undefined);
const mockOnTablesPrefetch = vi.fn();

function baseDeps(activeOutletId = 3) {
  return {
    activeOutletId,
    setQrOrderContext: vi.fn(),
    setCurrentOrderId: vi.fn(),
    setCart: vi.fn(),
    setCustomerName: vi.fn(),
    setCustomerPhone: vi.fn(),
    setSelectedTable: vi.fn(),
    setOrderType: vi.fn(),
    setSelectedMember: vi.fn(),
    setActiveReservationId: vi.fn(),
    setActiveReservationLabel: vi.fn(),
    getCartLength: () => 0,
    fetchMembers: mockFetchMembers,
    fetchOrderRemote: mockFetchOrderRemote,
    onTablesPrefetch: mockOnTablesPrefetch,
  };
}

describe("consumePosBridge", () => {
  beforeEach(() => {
    useQrOrderPosBridgeStore.getState().clear();
    useReservationPosBridgeStore.getState().clear();
    useOutletStore.setState({ activeOutletId: 3, activeOutletCode: null });
    mockFetchOrderRemote.mockReset();
    mockOnTablesPrefetch.mockReset();
    mockFetchMembers.mockClear();
  });

  it("applies QR payload and prefetches tables when tableId is present", async () => {
    useQrOrderPosBridgeStore.getState().setFromOpenInPos(
      { sessionType: "qr_order", sourceOrderCode: "QRO-1" },
      {
        requestId: "10",
        requestCode: "QRO-1",
        outletId: 3,
        tableId: 7,
        tableName: "T7",
        items: [{ id: "1", menuItemId: 1, name: "Nasi", price: 10000, qty: 1 }],
        subtotal: 10000,
        tax: 1000,
        total: 11000,
      },
    );

    const deps = baseDeps();
    const result = await consumePosBridge(deps);

    expect(result.consumedQr).toBe(true);
    expect(deps.setSelectedTable).toHaveBeenCalledWith("7");
    expect(deps.setOrderType).toHaveBeenCalledWith("Dine-in");
    expect(mockOnTablesPrefetch).toHaveBeenCalledTimes(1);
    expect(useQrOrderPosBridgeStore.getState().loadPayload).toBeNull();
  });

  it("syncs outlet and suppresses cart reset when bridge outlet differs", async () => {
    useQrOrderPosBridgeStore.getState().setFromOpenInPos(
      { sessionType: "qr_order", sourceOrderCode: "QRO-2" },
      {
        requestId: "11",
        requestCode: "QRO-2",
        outletId: 5,
        tableId: 2,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      },
    );

    const deps = baseDeps(3);
    await consumePosBridge(deps);

    expect(useOutletStore.getState().activeOutletId).toBe(5);
    expect(consumeOutletCartResetSuppression()).toBe(true);
  });

  it("does nothing when outlet context is not ready", async () => {
    const deps = baseDeps(null);
    const result = await consumePosBridge(deps);
    expect(result.consumedQr).toBe(false);
    expect(result.consumedReservation).toBe(false);
  });
});
