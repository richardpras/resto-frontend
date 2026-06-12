// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrOrderSearchBar } from "./QrOrderSearchBar";

describe("QrOrderSearchBar", () => {
  it("submits parsed order code on Enter", () => {
    const onSubmit = vi.fn();
    render(<QrOrderSearchBar value="QRO-ABC123" onChange={() => undefined} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByTestId("qr-order-search-input"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("QRO-ABC123");
  });

  it("extracts code from lookup URL", () => {
    const onSubmit = vi.fn();
    render(
      <QrOrderSearchBar
        value="https://app.test/qr/order/QRO-XYZ888"
        onChange={() => undefined}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(onSubmit).toHaveBeenCalledWith("QRO-XYZ888");
  });
});
