import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const fetchPosBootstrap = vi.fn();

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => "test-token",
}));

vi.mock("@/lib/api-integration/posBootstrapEndpoints", () => ({
  fetchPosBootstrap: (...args: unknown[]) => fetchPosBootstrap(...args),
}));

vi.mock("@/stores/settingsStore", () => ({
  hydratePosBootstrapSettings: vi.fn(),
}));

vi.mock("@/stores/posSessionStore", () => ({
  usePosSessionStore: {
    getState: () => ({
      hydrateFromBootstrap: vi.fn(),
    }),
  },
}));

import { usePosBootstrap } from "@/hooks/pos/usePosBootstrap";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe("usePosBootstrap offline retry", () => {
  beforeEach(() => {
    fetchPosBootstrap.mockReset();
    fetchPosBootstrap.mockRejectedValue(new Error("network"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not retry when navigator is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(
      () => usePosBootstrap({ tenantId: 1, outletId: 2 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.menuError).toBe(true);
    });

    expect(fetchPosBootstrap).toHaveBeenCalledTimes(1);
  });
});
