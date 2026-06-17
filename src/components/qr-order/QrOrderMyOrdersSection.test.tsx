// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QrOrderMyOrdersSection } from "./QrOrderMyOrdersSection";

const fetchGuestSessionOrders = vi.fn();

vi.mock("@/lib/api-integration/qrOrderPublicEndpoints", () => ({
  fetchGuestSessionOrders: (...args: unknown[]) => fetchGuestSessionOrders(...args),
}));

describe("QrOrderMyOrdersSection", () => {
  it("loads orders from guest session API", async () => {
    fetchGuestSessionOrders.mockResolvedValue([
      { orderCode: "QRO-ABC123", customerStatus: "waiting_confirmation", customerStatusLabel: "Waiting", createdAt: null },
    ]);

    render(
      <MemoryRouter>
        <QrOrderMyOrdersSection guestSessionToken="QGS_TESTTOKEN" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("QRO-ABC123")).toBeTruthy();
    });
    expect(fetchGuestSessionOrders).toHaveBeenCalledWith("QGS_TESTTOKEN", expect.objectContaining({ lang: "en" }));
  });
});
