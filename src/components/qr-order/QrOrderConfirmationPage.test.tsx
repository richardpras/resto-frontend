// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { QrOrderDetailView } from "./QrOrderDetailView";
import type { QrOrderPublicLookup } from "@/lib/api-integration/qrOrderPublicEndpoints";

const sampleOrder: QrOrderPublicLookup = {
  orderCode: "QRO-ABC123",
  tableName: "B01",
  outletName: "Mountain Cafe",
  status: "pending",
  customerStatus: "waiting_confirmation",
  customerStatusLabel: "Menunggu konfirmasi",
  timelineStep: 0,
  isTerminal: false,
  items: [
    {
      name: "Nasi Goreng",
      quantity: 2,
      note: "Pedas",
      unitPrice: 25000,
      lineTotal: 50000,
    },
  ],
  subtotal: 50000,
  discount: 0,
  total: 50000,
};

describe("QrOrderConfirmationPage", () => {
  it("shows order detail with items, total, and order QR code", () => {
    render(
      <MemoryRouter>
        <QrOrderDetailView order={sampleOrder} backToMenuHref="/qr/table-token" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("qr-order-code")).toHaveTextContent("QRO-ABC123");
    expect(screen.getByTestId("qr-order-items")).toHaveTextContent("Nasi Goreng");
    expect(screen.getByTestId("qr-order-total")).toHaveTextContent("Rp 50.000");
    expect(screen.getByTestId("qr-order-qr-code")).toBeInTheDocument();
    expect(screen.getByTestId("qr-order-status-label")).toHaveTextContent("Menunggu konfirmasi");
  });
});
