// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Cashier from "./Cashier";
import { addOrderPayments, listOrders } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  listOrders: vi.fn(),
  addOrderPayments: vi.fn(),
}));

describe("Cashier partial payment continuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads unpaid and partial orders and submits partial payment lines", async () => {
    vi.mocked(listOrders)
      .mockResolvedValueOnce([
        {
          id: "order-unpaid",
          code: "POS-UNPAID",
          source: "pos",
          orderType: "Dine-in",
          status: "confirmed",
          paymentStatus: "unpaid",
          items: [{ orderItemId: "11", id: "item-1", name: "Nasi Goreng", price: 50000, qty: 2 }],
          subtotal: 100000,
          tax: 10000,
          total: 110000,
          payments: [],
          customerName: "",
          customerPhone: "",
          tableNumber: "1",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "order-partial",
          code: "POS-PARTIAL",
          source: "pos",
          orderType: "Dine-in",
          status: "confirmed",
          paymentStatus: "partial",
          items: [
            { orderItemId: "21", id: "item-1", name: "Nasi Goreng", price: 50000, qty: 2 },
            { orderItemId: "22", id: "item-2", name: "Es Teh", price: 10000, qty: 1 },
          ],
          subtotal: 100000,
          tax: 10000,
          total: 110000,
          payments: [
            {
              id: "pay-1",
              method: "cash",
              amount: 30000,
              allocations: [{ orderItemId: 21, qty: 2, amount: 30000 }],
            },
          ],
          customerName: "",
          customerPhone: "",
          tableNumber: "2",
          splitBill: {
            method: "by-item",
            persons: [{ label: "Person 1", items: [{ itemId: "item-1", qty: 2 }, { itemId: "item-2", qty: 1 }] }],
          },
        },
      ] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    vi.mocked(addOrderPayments).mockResolvedValue({} as never);

    render(<Cashier />);

    expect(await screen.findByTestId("cashier-order-order-unpaid")).toBeTruthy();
    expect(await screen.findByTestId("cashier-order-order-partial")).toBeTruthy();

    fireEvent.click(screen.getByTestId("cashier-order-order-partial"));
    const amountInput = screen.getByDisplayValue("80000");
    fireEvent.change(amountInput, { target: { value: "20000" } });
    fireEvent.click(screen.getByText("Record Payment"));

    await waitFor(() => {
      expect(addOrderPayments).toHaveBeenCalledWith("order-partial", {
        payments: [
          expect.objectContaining({
            method: "cash",
            amount: 20000,
            allocations: [{ orderItemId: 21, qty: 2, amount: 20000 }],
          }),
        ],
      });
    });
  });
});
