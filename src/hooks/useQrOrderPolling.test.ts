// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQrOrderPolling } from "./useQrOrderPolling";

const fetchQrOrderPublic = vi.fn();

vi.mock("@/lib/api-integration/qrOrderPublicEndpoints", () => ({
  fetchQrOrderPublic: (...args: unknown[]) => fetchQrOrderPublic(...args),
}));

describe("useQrOrderPolling", () => {
  it(
    "continues polling when served but not terminal",
    async () => {
      fetchQrOrderPublic.mockResolvedValue({
        orderCode: "QRO-DONE123",
        customerStatus: "served",
        isTerminal: false,
      });

      renderHook(() => useQrOrderPolling("QRO-DONE123"));

      await waitFor(() => expect(fetchQrOrderPublic.mock.calls.length).toBeGreaterThanOrEqual(1));
      const baseline = fetchQrOrderPublic.mock.calls.length;

      await new Promise((resolve) => setTimeout(resolve, 5_200));

      expect(fetchQrOrderPublic.mock.calls.length).toBeGreaterThan(baseline);
    },
    10_000,
  );

  it(
    "stops polling when completed and isTerminal true",
    async () => {
      fetchQrOrderPublic.mockResolvedValue({
        orderCode: "QRO-DONE123",
        customerStatus: "completed",
        isTerminal: true,
      });

      const { result } = renderHook(() => useQrOrderPolling("QRO-DONE123"));

      await waitFor(() => expect(result.current.loading).toBe(false));
      const countAfterLoad = fetchQrOrderPublic.mock.calls.length;

      await new Promise((resolve) => setTimeout(resolve, 5_200));

      expect(fetchQrOrderPublic.mock.calls.length).toBe(countAfterLoad);
    },
    10_000,
  );

  it("shows friendly error for invalid order code", async () => {
    fetchQrOrderPublic.mockRejectedValue(new Error("not found"));
    const { result } = renderHook(() => useQrOrderPolling("QRO-BADCODE1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/not found or expired/i);
  });
});
