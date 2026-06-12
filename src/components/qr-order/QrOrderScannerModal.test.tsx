// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrOrderScannerModal } from "./QrOrderScannerModal";

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    isScanning: false,
  })),
}));

describe("QrOrderScannerModal", () => {
  it("renders camera scanner modal when open", () => {
    render(<QrOrderScannerModal open onClose={() => undefined} onScan={() => undefined} />);
    expect(screen.getByTestId("qr-order-scanner-modal")).toBeInTheDocument();
    expect(screen.getByText(/Scan QR/i)).toBeInTheDocument();
  });
});
