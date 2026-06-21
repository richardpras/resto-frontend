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

type MockSummary = {
  count: number;
  ids: string[];
  entries: Array<{ id: string; requestCode: string }>;
};

let mockState = {
  pendingSummary: null as MockSummary | null,
  pendingSummaryLoadedOnce: false,
};

vi.mock("@/stores/qrOrderStore", () => ({
  useQrOrderStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe("PosNewOrderSound", () => {
  beforeEach(() => {
    playSpy.mockClear();
    mockState = {
      pendingSummary: {
        count: 1,
        ids: ["1"],
        entries: [{ id: "1", requestCode: "QR-1" }],
      },
      pendingSummaryLoadedOnce: false,
    };
  });

  it("does not play on initial backlog", () => {
    mockState.pendingSummaryLoadedOnce = true;
    const { rerender } = renderHook(() => useQrOrderSoundAlerts(true));
    rerender();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("plays when a new pending order appears after init", () => {
    mockState.pendingSummaryLoadedOnce = true;
    const { rerender } = renderHook(() => useQrOrderSoundAlerts(true));
    rerender();
    playSpy.mockClear();

    mockState = {
      pendingSummaryLoadedOnce: true,
      pendingSummary: {
        count: 2,
        ids: ["1", "2"],
        entries: [
          { id: "1", requestCode: "QR-1" },
          { id: "2", requestCode: "QR-2" },
        ],
      },
    };
    rerender();
    expect(playSpy).toHaveBeenCalledWith("new_order", expect.objectContaining({ visualFallback: true }));
  });
});
