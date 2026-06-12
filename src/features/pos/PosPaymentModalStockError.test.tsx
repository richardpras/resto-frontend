// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosPaymentStockErrorAlert } from "@/components/pos/PosPaymentStockErrorAlert";
import type { PosStockErrorPayload } from "./posStockError";

const sampleError: PosStockErrorPayload = {
  code: "INSUFFICIENT_STOCK",
  message: "Some items are out of stock.",
  stock: [{ menuItemId: 1, name: "Nasi Goreng", requested: 2, available: 0, outletId: 3 }],
  recoverable: true,
  orderId: 1024,
  orderCode: "POS-ABC123",
};

describe("PosPaymentModalStockError", () => {
  it("shows stock error message in modal alert", () => {
    render(<PosPaymentStockErrorAlert error={sampleError} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Nasi Goreng/)).toBeTruthy();
    expect(screen.getByText(/requested 2, available 0/)).toBeTruthy();
  });

  it("resets acknowledgement when dismiss is clicked", () => {
    const onDismiss = vi.fn();
    render(<PosPaymentStockErrorAlert error={sampleError} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /update cart and try again/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
