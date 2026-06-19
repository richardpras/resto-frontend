// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyReservationPosPayload } from "./applyReservationPosPayload";
import type { Order } from "@/stores/orderStore";

const sampleOrder: Order = {
  id: "42",
  code: "ORD-42",
  source: "pos",
  orderType: "Dine In",
  items: [{ id: "1", name: "Tea", price: 15000, qty: 1, emoji: "🍵", notes: "" }],
  subtotal: 15000,
  tax: 1500,
  total: 16500,
  status: "confirmed",
  paymentStatus: "unpaid",
  payments: [],
  customerName: "Richard",
  customerPhone: "081",
};

describe("applyReservationPosPayload", () => {
  const setCart = vi.fn();
  const fetchOrderRemote = vi.fn().mockResolvedValue(sampleOrder);

  beforeEach(() => {
    setCart.mockReset();
    fetchOrderRemote.mockClear();
  });

  it("hydrates cart from linked order when cart is empty", async () => {
    await applyReservationPosPayload(
      {
        reservationId: 9,
        reservationCode: "RSV-1",
        outletId: 1,
        linkedOrderId: "42",
        tableId: 3,
        customerName: "Richard",
      },
      {
        setCurrentOrderId: vi.fn(),
        setCustomerName: vi.fn(),
        setCustomerPhone: vi.fn(),
        setSelectedTable: vi.fn(),
        setOrderType: vi.fn(),
        setSelectedMember: vi.fn(),
        setCart,
        getCartLength: () => 0,
        fetchMembers: vi.fn(),
        fetchOrderRemote,
        activeOutletId: 1,
      },
    );

    expect(fetchOrderRemote).toHaveBeenCalledWith("42");
    expect(setCart).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "1", name: "Tea", qty: 1 })]),
    );
  });
});
