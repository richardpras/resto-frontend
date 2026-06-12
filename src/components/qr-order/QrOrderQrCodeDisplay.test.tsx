// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QrOrderQrCodeDisplay } from "./QrOrderQrCodeDisplay";

describe("QrOrderQrCodeDisplay", () => {
  it("renders order QR code for cashier scanning", () => {
    render(<QrOrderQrCodeDisplay orderCode="QRO-ABC123" lookupUrl="https://app.test/qr/order/QRO-ABC123" />);
    expect(screen.getByTestId("qr-order-qr-code")).toBeInTheDocument();
    expect(screen.getByText(/Show this QR code to cashier/i)).toBeInTheDocument();
  });
});
