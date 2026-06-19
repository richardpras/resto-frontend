// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosOrderRecoveryPanel } from "./PosOrderRecoveryPanel";
import type { Order } from "@/stores/orderStore";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => true }),
}));

vi.mock("@/stores/orderStore", () => ({
  useOrderStore: (selector: (s: { recoverySubmitting: boolean; reportOrderItemRecoveryRemote: () => void; updateOrderRemote: () => void }) => unknown) =>
    selector({
      recoverySubmitting: false,
      reportOrderItemRecoveryRemote: vi.fn(),
      updateOrderRemote: vi.fn(),
    }),
}));

const baseOrder: Order = {
  id: "1",
  code: "ORD-1",
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  paymentStatus: "unpaid",
  payments: [],
  status: "confirmed",
  source: "pos",
  orderType: "Dine In",
  serviceMode: "dine_in",
  orderChannel: "dine_in",
};

describe("PosOrderRecoveryPanel", () => {
  it("does not render when order has no line items", () => {
    const { container } = render(<PosOrderRecoveryPanel order={baseOrder} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when order has line items", () => {
    const { getByTestId } = render(
      <PosOrderRecoveryPanel
        order={{
          ...baseOrder,
          items: [{ id: "10", orderItemId: "10", name: "Tea", price: 15000, qty: 1 }],
        }}
      />,
    );
    expect(getByTestId("pos-order-recovery-panel")).toBeInTheDocument();
  });
});
