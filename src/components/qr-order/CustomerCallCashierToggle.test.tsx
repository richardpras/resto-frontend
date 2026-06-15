// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QrOrderDetailView } from "./QrOrderDetailView";
import type { QrOrderPublicLookup } from "@/lib/api-integration/qrOrderPublicEndpoints";

const baseOrder: QrOrderPublicLookup = {
  orderCode: "QRO-ABC123",
  tableName: "B01",
  outletName: "Mountain Cafe",
  status: "pending",
  customerStatus: "pending_review",
  customerStatusLabel: "Menunggu konfirmasi",
  timelineStep: 0,
  isTerminal: false,
  items: [
    {
      name: "Nasi Goreng",
      quantity: 1,
      unitPrice: 25000,
      lineTotal: 25000,
    },
  ],
  subtotal: 25000,
  discount: 0,
  total: 25000,
  qrOrdering: { enableCallCashier: true },
};

describe("CustomerCallCashierToggle", () => {
  it("shows Call Cashier when setting is enabled", () => {
    const onCallCashier = vi.fn();
    render(
      <MemoryRouter>
        <QrOrderDetailView
          order={baseOrder}
          onCallCashier={onCallCashier}
          enableCallCashier
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: /call cashier/i });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onCallCashier).toHaveBeenCalledOnce();
  });

  it("hides Call Cashier when setting is disabled", () => {
    render(
      <MemoryRouter>
        <QrOrderDetailView
          order={{ ...baseOrder, qrOrdering: { enableCallCashier: false } }}
          onCallCashier={vi.fn()}
          enableCallCashier={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /call cashier/i })).toBeNull();
  });

  it("defaults to showing Call Cashier when qrOrdering config is absent", () => {
    const { qrOrdering: _ignored, ...orderWithoutConfig } = baseOrder;
    render(
      <MemoryRouter>
        <QrOrderDetailView order={orderWithoutConfig} onCallCashier={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /call cashier/i })).toBeTruthy();
  });
});
