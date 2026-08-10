// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QrOrderScannerModal } from "./QrOrderScannerModal";

const start = vi.fn().mockResolvedValue(undefined);
const stop = vi.fn().mockResolvedValue(undefined);
const clear = vi.fn();

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: Object.assign(
    vi.fn().mockImplementation(() => ({
      start,
      stop,
      clear,
      isScanning: false,
    })),
    {
      getCameras: vi.fn().mockResolvedValue([{ id: "cam-1", label: "Back Camera" }]),
    },
  ),
}));

describe("QrOrderScannerModal", () => {
  beforeEach(() => {
    start.mockClear();
    stop.mockClear();
    clear.mockClear();
  });

  it("renders camera scanner modal when open", async () => {
    render(<QrOrderScannerModal open onClose={() => undefined} onScan={() => undefined} />);
    expect(screen.getByTestId("qr-order-scanner-modal")).toBeInTheDocument();
    expect(screen.getByText(/Scan QR/i)).toBeInTheDocument();
    await waitFor(() => expect(start).toHaveBeenCalled());
  });

  it("does not restart camera when parent callbacks change identity", async () => {
    const { rerender } = render(
      <QrOrderScannerModal open onClose={() => undefined} onScan={() => undefined} />,
    );
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));

    rerender(
      <QrOrderScannerModal
        open
        onClose={() => undefined}
        onScan={() => undefined}
      />,
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });
});
