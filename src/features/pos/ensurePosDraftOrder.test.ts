import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/stores/orderStore";
import { ensurePosDraftOrder, EnsurePosDraftOrderError } from "./ensurePosDraftOrder";

const unpaidOrder: Order = {
  id: "10",
  code: "ORD-10",
  source: "pos",
  orderType: "Dine In",
  items: [],
  subtotal: 250000,
  tax: 25000,
  total: 275000,
  status: "confirmed",
  paymentStatus: "unpaid",
  payments: [],
  customerName: "Guest",
  customerPhone: "",
};

describe("ensurePosDraftOrder", () => {
  it("throws when cart is empty", async () => {
    await expect(
      ensurePosDraftOrder({
        cartLength: 0,
        currentOrderId: null,
        currentOpenOrder: null,
        createOrderRemote: vi.fn(),
        updateOrderRemote: vi.fn(),
        buildCartUpdate: vi.fn(),
        buildCreatePayload: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(EnsurePosDraftOrderError);
  });

  it("creates order when no currentOrderId", async () => {
    const createOrderRemote = vi.fn().mockResolvedValue({
      order: { ...unpaidOrder, id: "99" },
      resumed: false,
    });

    const orderId = await ensurePosDraftOrder({
      cartLength: 2,
      currentOrderId: null,
      currentOpenOrder: null,
      createOrderRemote,
      updateOrderRemote: vi.fn(),
      buildCartUpdate: vi.fn(),
      buildCreatePayload: vi.fn().mockReturnValue({ code: "AUTO" }),
    });

    expect(orderId).toBe("99");
    expect(createOrderRemote).toHaveBeenCalledOnce();
  });

  it("syncs open bill when unpaid order exists", async () => {
    const updateOrderRemote = vi.fn().mockResolvedValue({ ...unpaidOrder, id: "10" });

    const orderId = await ensurePosDraftOrder({
      cartLength: 2,
      currentOrderId: "10",
      currentOpenOrder: unpaidOrder,
      createOrderRemote: vi.fn(),
      updateOrderRemote,
      buildCartUpdate: vi.fn().mockReturnValue({ subtotal: 300000 }),
      buildCreatePayload: vi.fn(),
    });

    expect(orderId).toBe("10");
    expect(updateOrderRemote).toHaveBeenCalledWith("10", { subtotal: 300000 });
  });

  it("returns existing order id without sync when not open bill", async () => {
    const paidOrder = { ...unpaidOrder, paymentStatus: "paid" as const };

    const orderId = await ensurePosDraftOrder({
      cartLength: 1,
      currentOrderId: "10",
      currentOpenOrder: paidOrder,
      createOrderRemote: vi.fn(),
      updateOrderRemote: vi.fn(),
      buildCartUpdate: vi.fn(),
      buildCreatePayload: vi.fn(),
    });

    expect(orderId).toBe("10");
  });
});
