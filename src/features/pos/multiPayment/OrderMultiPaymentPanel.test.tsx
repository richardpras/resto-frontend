// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Banknote, QrCode } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { OrderMultiPaymentPanel } from "./OrderMultiPaymentPanel";
import type { PaymentDraftLine } from "./multiPaymentTypes";

vi.mock("@/i18n/useOpsTranslation", () => ({
  useOpsTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      if (vars?.amount) return `${key}:${vars.amount}`;
      return key;
    },
  }),
}));

const cashTile = {
  method: {
    id: 1,
    outletId: 1,
    paymentMethodCode: "cash",
    type: "cash" as const,
    enabled: true,
    displayOrder: 10,
    isDefault: true,
    label: "Cash",
    settlementMethod: "cash",
    isCash: true,
    isGateway: false,
    isManualQris: false,
  },
  icon: Banknote,
};

const qrisTile = {
  method: {
    id: 2,
    outletId: 1,
    paymentMethodCode: "manual_qris",
    type: "manual_qris" as const,
    enabled: true,
    displayOrder: 20,
    isDefault: false,
    label: "QRIS",
    settlementMethod: "qris",
    isCash: false,
    isGateway: false,
    isManualQris: true,
  },
  icon: QrCode,
};

describe("OrderMultiPaymentPanel", () => {
  it("renders nothing when multi payment disabled", () => {
    const { container } = render(
      <OrderMultiPaymentPanel
        balanceDue={100000}
        draftLines={[]}
        checkoutTiles={[cashTile]}
        enableMultiPayment={false}
        onAddLine={() => true}
        onRemoveLine={() => {}}
        onClearDraft={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("auto-allocates remaining balance when cash is selected", () => {
    const onAddLine = vi.fn(() => true);

    render(
      <OrderMultiPaymentPanel
        balanceDue={36000}
        draftLines={[]}
        checkoutTiles={[cashTile]}
        enableMultiPayment
        onAddLine={onAddLine}
        onRemoveLine={() => {}}
        onClearDraft={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: /Cash/i }));

    expect(onAddLine).toHaveBeenCalledWith("cash", "Cash", 36000);
  });

  it("adds a non-cash draft line from allocation input", () => {
    const onAddLine = vi.fn(() => true);
    const lines: PaymentDraftLine[] = [];

    render(
      <OrderMultiPaymentPanel
        balanceDue={100000}
        draftLines={lines}
        checkoutTiles={[cashTile, qrisTile]}
        enableMultiPayment
        onAddLine={onAddLine}
        onRemoveLine={() => {}}
        onClearDraft={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: /QRIS/i }));
    fireEvent.change(screen.getByLabelText("shared.paymentAllocation"), {
      target: { value: "30000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "shared.addPayment" }));

    expect(onAddLine).toHaveBeenCalledWith("qris", "QRIS", 30000);
  });
});
