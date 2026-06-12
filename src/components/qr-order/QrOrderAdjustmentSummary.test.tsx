// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QrOrderAdjustmentSummary } from "./QrOrderAdjustmentSummary";

describe("QrOrderAdjustmentSummary", () => {
  it("shows removed items and new total", () => {
    render(
      <QrOrderAdjustmentSummary
        adjustments={[{ type: "removed", name: "Es Teh", reason: "Sold Out" }]}
        promoLabel="Weekend Promo"
        subtotal={50000}
        discount={5000}
        total={45000}
      />,
    );
    expect(screen.getByText(/Es Teh/)).toBeInTheDocument();
    expect(screen.getByText(/Weekend Promo/)).toBeInTheDocument();
    expect(screen.getByTestId("qr-adjustment-new-total")).toHaveTextContent("Rp 45.000");
  });
});
