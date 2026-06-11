// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKitchenFullscreen } from "./useKitchenFullscreen";

describe("useKitchenFullscreen", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-kds-kiosk");
    document.body.classList.remove("kds-kiosk-active");
    vi.restoreAllMocks();
  });

  it("enables kiosk overlay and DOM attributes on toggle", async () => {
    const ref = createRef<HTMLDivElement>();
    const node = document.createElement("div");
    ref.current = node;
    document.body.appendChild(node);

    node.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useKitchenFullscreen(ref));

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(result.current.isFullscreen).toBe(true);
    expect(document.documentElement.getAttribute("data-kds-kiosk")).toBe("true");
    expect(document.body.classList.contains("kds-kiosk-active")).toBe(true);

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(result.current.isFullscreen).toBe(false);
    expect(document.documentElement.hasAttribute("data-kds-kiosk")).toBe(false);
  });

  it("keeps kiosk mode when requestFullscreen fails", async () => {
    const ref = createRef<HTMLDivElement>();
    const node = document.createElement("div");
    ref.current = node;
    node.requestFullscreen = vi.fn().mockRejectedValue(new Error("blocked"));

    const { result } = renderHook(() => useKitchenFullscreen(ref));

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(result.current.isFullscreen).toBe(true);
    expect(document.documentElement.getAttribute("data-kds-kiosk")).toBe("true");
  });
});
