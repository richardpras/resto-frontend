// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QrOrderPreviewDrawer } from "./QrOrderPreviewDrawer";

const mockNavigate = vi.fn();
const mockSetFromOpenInPos = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/stores/qrOrderPosBridgeStore", () => ({
  useQrOrderPosBridgeStore: (selector: (state: { setFromOpenInPos: typeof mockSetFromOpenInPos }) => unknown) =>
    selector({ setFromOpenInPos: mockSetFromOpenInPos }),
}));

vi.mock("@/lib/api-integration/qrOrderReviewEndpoints", () => ({
  fetchQrOrderPreview: vi.fn().mockResolvedValue({
    id: "9",
    requestCode: "QRO-ABC123",
    outletId: 1,
    tableId: 2,
    tableName: "B01",
    customerName: "Guest",
    customerNotes: ["No spicy"],
    status: "pending_cashier_confirmation",
    items: [{ menuItemId: 1, name: "Nasi Goreng", qty: 1, unitPrice: 25000, lineTotal: 25000 }],
    subtotal: 25000,
    discount: 0,
    total: 25000,
    createdAt: "2026-06-12T10:00:00.000Z",
  }),
  openQrOrderInPos: vi.fn().mockResolvedValue({
    posSession: { sessionType: "qr_order", sourceOrderCode: "QRO-ABC123" },
    loadPayload: {
      requestId: "9",
      requestCode: "QRO-ABC123",
      outletId: 1,
      tableId: 2,
      tableName: "B01",
      items: [{ id: "1", menuItemId: 1, name: "Nasi Goreng", price: 25000, qty: 1 }],
      subtotal: 25000,
      tax: 0,
      total: 25000,
    },
    request: { id: "9", requestCode: "QRO-ABC123" },
  }),
}));

vi.mock("@/lib/api-integration/qrOrderEndpoints", () => ({
  rejectQrOrder: vi.fn().mockResolvedValue({}),
}));

describe("QrOrderPreviewDrawer", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSetFromOpenInPos.mockReset();
  });

  it("renders read-only preview and opens POS", async () => {
    render(
      <MemoryRouter>
        <QrOrderPreviewDrawer requestId="9" open onOpenChange={() => undefined} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("QRO-ABC123")).toBeInTheDocument();
    expect(screen.getByText(/No spicy/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apply promo/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("qr-order-open-in-pos-button"));

    await waitFor(() => {
      expect(mockSetFromOpenInPos).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/pos");
    });
  });
});
