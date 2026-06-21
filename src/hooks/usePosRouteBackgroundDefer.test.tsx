// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  POS_BACKGROUND_REQUEST_DEFER_MS,
  isHeavyCheckoutRoute,
  usePosRouteBackgroundDefer,
} from "./usePosRouteBackgroundDefer";

function renderDeferHook(initialPath: string) {
  return renderHook(() => usePosRouteBackgroundDefer(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    ),
  });
}

describe("usePosRouteBackgroundDefer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects heavy checkout routes", () => {
    expect(isHeavyCheckoutRoute("/pos")).toBe(true);
    expect(isHeavyCheckoutRoute("/cashier/")).toBe(true);
    expect(isHeavyCheckoutRoute("/dashboard")).toBe(false);
  });

  it("is ready immediately on non-checkout routes", () => {
    const { result } = renderDeferHook("/dashboard");
    expect(result.current).toBe(true);
  });

  it("defers background work on POS route", () => {
    const { result } = renderDeferHook("/pos");
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(POS_BACKGROUND_REQUEST_DEFER_MS);
    });

    expect(result.current).toBe(true);
  });
});
