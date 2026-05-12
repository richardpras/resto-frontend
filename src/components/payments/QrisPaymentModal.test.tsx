import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrisPaymentModal } from "./QrisPaymentModal";

describe("QrisPaymentModal", () => {
  it("renders QR state and actions", () => {
    render(
      <QrisPaymentModal
        open
        qrString="000201010212TEST"
        amount={123400}
        expirySeconds={120}
        status="pending"
        onRequestClose={vi.fn()}
        onRetry={vi.fn()}
        onReconcile={vi.fn()}
        onExpire={vi.fn()}
      />,
    );

    expect(screen.getByText("Scan QRIS")).toBeInTheDocument();
    expect(screen.getByText("Rp 123.400")).toBeInTheDocument();
    expect(screen.getByText(/expires in/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("asks confirmation before close while pending", () => {
    const onRequestClose = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <QrisPaymentModal
        open
        qrString="000201010212TEST"
        amount={123400}
        expirySeconds={120}
        status="pending"
        onRequestClose={onRequestClose}
        onRetry={vi.fn()}
        onReconcile={vi.fn()}
        onExpire={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Close QR modal"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onRequestClose).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("shows provider simulate button only when enabled", () => {
    const onSim = vi.fn();
    const { rerender } = render(
      <QrisPaymentModal
        open
        qrString="000201010212TEST"
        amount={123400}
        expirySeconds={120}
        status="pending"
        showProviderSimulate={false}
        onSimulateViaXendit={onSim}
        onRequestClose={vi.fn()}
        onRetry={vi.fn()}
        onReconcile={vi.fn()}
        onExpire={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Simulate via Xendit" })).not.toBeInTheDocument();

    rerender(
      <QrisPaymentModal
        open
        qrString="000201010212TEST"
        amount={123400}
        expirySeconds={120}
        status="pending"
        showProviderSimulate
        onSimulateViaXendit={onSim}
        onRequestClose={vi.fn()}
        onRetry={vi.fn()}
        onReconcile={vi.fn()}
        onExpire={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Simulate via Xendit" }));
    expect(onSim).toHaveBeenCalledTimes(1);
  });

  it("shows loading state for provider simulation", () => {
    render(
      <QrisPaymentModal
        open
        qrString="000201010212TEST"
        amount={123400}
        expirySeconds={120}
        status="pending"
        showProviderSimulate
        providerSimulating
        onSimulateViaXendit={vi.fn()}
        onRequestClose={vi.fn()}
        onRetry={vi.fn()}
        onReconcile={vi.fn()}
        onExpire={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Simulating…" })).toBeDisabled();
  });
});

