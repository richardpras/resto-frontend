// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePosBootstrap } from "./usePosBootstrap";
import { useSettingsStore, resetSettingsSectionRequestState } from "@/stores/settingsStore";
import { usePosSessionStore } from "@/stores/posSessionStore";

const mockFetchPosBootstrap = vi.fn();

vi.mock("@/lib/api-integration/posBootstrapEndpoints", () => ({
  fetchPosBootstrap: (...args: unknown[]) => mockFetchPosBootstrap(...args),
}));

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: vi.fn(() => "token"),
}));

function renderBootstrapHook() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(
    () => usePosBootstrap({ tenantId: 1, outletId: 3 }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
}

describe("usePosBootstrap", () => {
  beforeEach(() => {
    mockFetchPosBootstrap.mockReset();
    resetSettingsSectionRequestState();
    usePosSessionStore.getState().reset();
    mockFetchPosBootstrap.mockResolvedValue({
      merchant: { name: "Test", currency: "IDR", timezone: "Asia/Jakarta", language: "id" },
      system: {
        enableSplitBill: true,
        enableMultiPayment: true,
        confirmBeforePayment: true,
        enableQROrdering: true,
        enableCallCashier: true,
        qrPendingConfirmationTtlMinutes: 20,
        enforceStockOnSale: false,
        stockEnforcementMode: "deferred",
        allowNegativeStock: true,
      },
      menuItems: {
        data: [{ id: "1", name: "Item", price: 1000, available: true }],
        meta: { current_page: 1, perPage: 200, total: 1, lastPage: 1 },
      },
      posSession: null,
    });
  });

  it("seeds settings and session stores from bootstrap response", async () => {
    renderBootstrapHook();

    await waitFor(() => {
      expect(mockFetchPosBootstrap).toHaveBeenCalledWith({
        outletId: 3,
        tenantId: 1,
        perPage: 200,
      });
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().merchant.language).toBe("id");
      expect(usePosSessionStore.getState().bootstrapSyncedOutletId).toBe(3);
    });
  });
});
