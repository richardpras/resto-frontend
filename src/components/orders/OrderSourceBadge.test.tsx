import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderSourceBadge } from "@/components/orders/OrderSourceBadge";

describe("OrderSourceBadge", () => {
  it("renders QR order source", () => {
    render(
      <OrderSourceBadge
        testId="source-badge"
        source={{ type: "qr_order", label: "QR Order", code: "QRO-001", id: 1 }}
      />,
    );
    expect(screen.getByTestId("source-badge")).toHaveTextContent("QR Order QRO-001");
  });

  it("renders direct POS fallback", () => {
    render(<OrderSourceBadge testId="source-badge" source={null} />);
    expect(screen.getByTestId("source-badge")).toHaveTextContent("Direct POS");
  });
});
