// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QrOrderStatusTimeline } from "./QrOrderStatusTimeline";

describe("QrOrderDetailStatusTimeline", () => {
  it("highlights the active timeline step", () => {
    render(<QrOrderStatusTimeline customerStatus="preparing" timelineStep={2} />);
    expect(screen.getByTestId("qr-timeline-step-preparing")).toHaveAttribute("data-active", "true");
  });

  it("shows cancelled state clearly", () => {
    render(<QrOrderStatusTimeline customerStatus="cancelled" timelineStep={null} />);
    expect(screen.getByTestId("qr-order-status-cancelled")).toBeInTheDocument();
  });

  it("shows adjusted cashier message", () => {
    render(<QrOrderStatusTimeline customerStatus="adjusted" timelineStep={1} />);
    expect(screen.getByTestId("qr-order-status-adjusted")).toHaveTextContent(
      /Pesanan Anda telah diperbarui oleh kasir/i,
    );
  });
});
