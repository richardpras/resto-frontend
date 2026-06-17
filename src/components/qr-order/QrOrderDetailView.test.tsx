// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { QrOrderDetailView } from "./QrOrderDetailView";
import type { QrOrderPublicLookup } from "@/lib/api-integration/qrOrderPublicEndpoints";

function buildOrder(overrides: Partial<QrOrderPublicLookup> = {}): QrOrderPublicLookup {
  return {
    orderCode: "QRO-TEST001",
    tableName: "T1",
    outletName: "Outlet",
    status: "served",
    customerStatus: "served",
    customerStatusLabel: "Served",
    timelineStep: 4,
    isTerminal: false,
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    paymentStatus: "unpaid",
    openBill: { status: "Unpaid", paymentStatus: "unpaid", total: 10000, orderCode: "ORD-1" },
    ...overrides,
  };
}

describe("QrOrderDetailView", () => {
  it("shows awaiting payment hint when served and unpaid", () => {
    render(
      <MemoryRouter>
        <QrOrderDetailView order={buildOrder()} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("qr-order-awaiting-payment-hint")).toBeInTheDocument();
  });

  it("hides awaiting payment hint when order is completed", () => {
    render(
      <MemoryRouter>
        <QrOrderDetailView
          order={buildOrder({
            customerStatus: "completed",
            customerStatusLabel: "Completed",
            timelineStep: 5,
            isTerminal: true,
            paymentStatus: "paid",
            openBill: null,
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("qr-order-awaiting-payment-hint")).not.toBeInTheDocument();
  });
});
