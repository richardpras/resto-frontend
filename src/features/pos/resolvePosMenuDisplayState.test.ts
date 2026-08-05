import { describe, expect, it } from "vitest";
import { resolvePosMenuDisplayState } from "@/features/pos/resolvePosMenuDisplayState";

describe("resolvePosMenuDisplayState", () => {
  it("hides online error when offline bootstrap menu is present", () => {
    const state = resolvePosMenuDisplayState({
      isOfflineMode: true,
      offlineMenuCount: 8,
      menuLoading: false,
      menuError: true,
    });
    expect(state.hasOfflineMenu).toBe(true);
    expect(state.showMenuError).toBe(false);
    expect(state.showMenuLoading).toBe(false);
  });

  it("does not treat empty offline cache as menu ready", () => {
    const state = resolvePosMenuDisplayState({
      isOfflineMode: true,
      offlineMenuCount: 0,
      menuLoading: false,
      menuError: true,
    });
    expect(state.hasOfflineMenu).toBe(false);
    expect(state.showMenuError).toBe(true);
  });

  it("skips loading skeleton when offline menu already available", () => {
    const state = resolvePosMenuDisplayState({
      isOfflineMode: true,
      offlineMenuCount: 3,
      menuLoading: true,
      menuError: false,
    });
    expect(state.showMenuLoading).toBe(false);
  });

  it("keeps online loading/error behavior when not offline", () => {
    expect(
      resolvePosMenuDisplayState({
        isOfflineMode: false,
        offlineMenuCount: 8,
        menuLoading: true,
        menuError: false,
      }),
    ).toMatchObject({ showMenuLoading: true, showMenuError: false });

    expect(
      resolvePosMenuDisplayState({
        isOfflineMode: false,
        offlineMenuCount: 0,
        menuLoading: false,
        menuError: true,
      }),
    ).toMatchObject({ showMenuLoading: false, showMenuError: true });
  });
});
