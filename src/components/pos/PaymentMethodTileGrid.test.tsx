// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Banknote } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { PaymentMethodTileGrid } from "./PaymentMethodTileGrid";

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
  },
  icon: Banknote,
};

const qrisTile = {
  method: {
    id: 2,
    outletId: 1,
    paymentMethodCode: "manual_qris",
    type: "manual_qris" as const,
    provider: "manual",
    enabled: true,
    displayOrder: 20,
    isDefault: false,
    label: "QRIS",
    settlementMethod: "qris",
    isManualQris: true,
  },
  icon: Banknote,
};

describe("PaymentMethodTileGrid", () => {
  it("renders all payment method labels", () => {
    render(
      <PaymentMethodTileGrid
        tiles={[cashTile, qrisTile]}
        selectedCode={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: /Cash/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /QRIS/i })).toBeTruthy();
  });

  it("calls onSelect with payment method code", () => {
    const onSelect = vi.fn();
    render(
      <PaymentMethodTileGrid tiles={[cashTile]} selectedCode={null} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("option", { name: /Cash/i }));
    expect(onSelect).toHaveBeenCalledWith("cash");
  });
});
