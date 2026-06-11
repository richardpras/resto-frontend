// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQrOrderSoundAlerts } from "./useQrOrderSoundAlerts";
import { soundAlertService } from "@/lib/sound/soundAlertService";

const playSpy = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/sound/soundAlertService", () => ({
  soundAlertService: {
    play: (...args: unknown[]) => playSpy(...args),
  },
}));

let mockState = {
  requests: [] as Array<{ id: string; status: string; requestCode: string }>,
  hasLoadedOnce: false,
};

vi.mock("@/stores/qrOrderStore", () => ({
  useQrOrderStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe("PosNewOrderSound", () => {
  beforeEach(() => {
    playSpy.mockClear();
    mockState = {
      requests: [{ id: "1", status: "pending_cashier_confirmation", requestCode: "QR-1" }],
      hasLoadedOnce: false,
    };
  });

  it("does not play on initial backlog", () => {
    mockState.hasLoadedOnce = true;
    const { rerender } = renderHook(() => useQrOrderSoundAlerts(true));
    rerender();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("plays when a new pending order appears after init", () => {
    mockState.hasLoadedOnce = true;
    const { rerender } = renderHook(() => useQrOrderSoundAlerts(true));
    rerender();
    playSpy.mockClear();

    mockState = {
      hasLoadedOnce: true,
      requests: [
        { id: "1", status: "pending_cashier_confirmation", requestCode: "QR-1" },
        { id: "2", status: "pending_cashier_confirmation", requestCode: "QR-2" },
      ],
    };
    rerender();
    expect(playSpy).toHaveBeenCalledWith("new_order", expect.objectContaining({ visualFallback: true }));
  });
});
