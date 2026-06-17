// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Banknote } from "lucide-react";
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

  it("adds a draft line when method and amount are provided", () => {
    const onAddLine = vi.fn(() => true);
    const lines: PaymentDraftLine[] = [];

    render(
      <OrderMultiPaymentPanel
        balanceDue={100000}
        draftLines={lines}
        checkoutTiles={[cashTile]}
        enableMultiPayment
        onAddLine={onAddLine}
        onRemoveLine={() => {}}
        onClearDraft={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: /Cash/i }));
    fireEvent.change(screen.getByLabelText("shared.paymentAmount"), {
      target: { value: "30000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "shared.addPayment" }));

    expect(onAddLine).toHaveBeenCalledWith("cash", "Cash", 30000);
  });
});
