// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCriticalNotificationSoundAlerts } from "./useCriticalNotificationSoundAlerts";

const playSpy = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/sound/soundAlertService", () => ({
  soundAlertService: {
    play: (...args: unknown[]) => playSpy(...args),
  },
}));

let mockState = {
  preview: [] as Array<{ id: number; severity: string; isRead: boolean; title: string }>,
  loading: true,
};

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe("CriticalNotificationSound", () => {
  beforeEach(() => {
    playSpy.mockClear();
    mockState = {
      preview: [{ id: 10, severity: "critical", isRead: false, title: "Printer offline" }],
      loading: true,
    };
  });

  it("does not play on initial preview load", () => {
    mockState.loading = false;
    const { rerender } = renderHook(() => useCriticalNotificationSoundAlerts(true));
    rerender();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("plays when a new critical notification appears", () => {
    mockState.loading = false;
    const { rerender } = renderHook(() => useCriticalNotificationSoundAlerts(true));
    rerender();
    playSpy.mockClear();

    mockState = {
      loading: false,
      preview: [
        { id: 10, severity: "critical", isRead: false, title: "Printer offline" },
        { id: 11, severity: "critical", isRead: false, title: "Payment gateway down" },
      ],
    };
    rerender();
    expect(playSpy).toHaveBeenCalledWith(
      "critical_alert",
      expect.objectContaining({ visualFallback: true }),
    );
  });
});
