// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQrOrderPolling } from "./useQrOrderPolling";

const fetchQrOrderPublic = vi.fn();

vi.mock("@/lib/api-integration/qrOrderPublicEndpoints", () => ({
  fetchQrOrderPublic: (...args: unknown[]) => fetchQrOrderPublic(...args),
}));

describe("useQrOrderPolling", () => {
  it("stops polling after served status", async () => {
    fetchQrOrderPublic.mockResolvedValue({
      orderCode: "QRO-DONE123",
      customerStatus: "served",
      isTerminal: true,
    });

    const { result } = renderHook(() => useQrOrderPolling("QRO-DONE123"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchQrOrderPublic).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchQrOrderPublic).toHaveBeenCalledTimes(1);
  });

  it("shows friendly error for invalid order code", async () => {
    fetchQrOrderPublic.mockRejectedValue(new Error("not found"));
    const { result } = renderHook(() => useQrOrderPolling("QRO-BADCODE1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/not found or expired/i);
  });
});
