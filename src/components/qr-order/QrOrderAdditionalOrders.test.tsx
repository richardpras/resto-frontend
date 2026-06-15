// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QrOrderMyOrdersSection } from "./QrOrderMyOrdersSection";
import { addActiveOrderCode } from "@/lib/qrOrderSession";

const fetchQrOrderPublic = vi.fn();

vi.mock("@/lib/api-integration/qrOrderPublicEndpoints", () => ({
  fetchQrOrderPublic: (...args: unknown[]) => fetchQrOrderPublic(...args),
}));

describe("QrOrderAdditionalOrders", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchQrOrderPublic.mockReset();
    fetchQrOrderPublic.mockImplementation(async (code: string) => ({
      orderCode: code,
      customerStatusLabel: code === "QRO-ABC123" ? "Menunggu konfirmasi" : "Sedang diproses",
    }));
  });

  it("lists active orders and labels additional orders", async () => {
    addActiveOrderCode("table-token", "QRO-ABC123");
    addActiveOrderCode("table-token", "QRO-XYZ888");

    render(
      <MemoryRouter>
        <QrOrderMyOrdersSection tableToken="table-token" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("qr-my-orders")).toBeInTheDocument();
    });

    expect(screen.getByText("QRO-ABC123")).toBeInTheDocument();
    expect(screen.getByText("QRO-XYZ888")).toBeInTheDocument();
    expect(screen.getByText("Additional Order")).toBeInTheDocument();
  });
});
