// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Kitchen from "./Kitchen";

const mockStartPolling = vi.fn();
const mockStopPolling = vi.fn();
const mockUseOutletStore = vi.fn();
const mockUseAuthStore = vi.fn();

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number | null }) => unknown) =>
    mockUseOutletStore(selector),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: { KITCHEN: "kitchen.use" },
  useAuthStore: (selector: (state: { hasPermission: (perm: string) => boolean }) => unknown) =>
    mockUseAuthStore(selector),
}));

vi.mock("@/stores/kitchenStore", () => ({
  useKitchenStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      tickets: [],
      error: null,
      isLoading: false,
      isSubmitting: false,
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
      updateTicketStatus: vi.fn(),
    }),
}));

describe("Kitchen production flow guards", () => {
  beforeEach(() => {
    mockStartPolling.mockReset();
    mockStopPolling.mockReset();
    mockUseOutletStore.mockImplementation(
      (selector: (state: { activeOutletId: number | null }) => unknown) =>
        selector({ activeOutletId: 2 }),
    );
    mockUseAuthStore.mockImplementation(
      (selector: (state: { hasPermission: (perm: string) => boolean }) => unknown) =>
        selector({ hasPermission: () => true }),
    );
  });

  it("starts polling with store action and stops polling on unmount", () => {
    const { unmount } = render(<Kitchen />);
    expect(mockStartPolling).toHaveBeenCalledWith({ outletId: 2, perPage: 200 });
    unmount();
    expect(mockStopPolling).toHaveBeenCalled();
  });
});
