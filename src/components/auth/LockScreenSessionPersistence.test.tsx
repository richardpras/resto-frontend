// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LockScreen } from "@/components/auth/LockScreen";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/mobile/platform", () => ({
  isNativePosShell: () => false,
  isCapacitorNative: () => false,
  isNativeAndroid: () => false,
}));

vi.mock("@/mobile/offline/offlineScreenPin", () => ({
  hasCachedScreenPinVerifier: vi.fn(async () => false),
  hasCachedPasswordVerifier: vi.fn(async () => true),
  cacheScreenPinVerifier: vi.fn(async () => undefined),
  cachePasswordVerifier: vi.fn(async () => undefined),
  clearAllLocalUnlockVerifiers: vi.fn(async () => undefined),
  verifyScreenPinLocally: vi.fn(async () => false),
  verifyPasswordLocally: vi.fn(async () => false),
}));

describe("LockScreenSessionPersistence", () => {
  it("shows lock UI while preserving auth and outlet context", () => {
    useOutletStore.setState({ activeOutletId: 7, activeOutletCode: "JKT" });
    useOfflineSyncStore.setState({ isOnline: false });
    useAuthStore.setState({
      user: {
        id: "1",
        name: "Cashier One",
        email: "cashier@example.com",
        role: "Cashier",
        outletIds: [7],
        pinSet: true,
        permissions: [],
        permissionCodes: [],
      },
      locked: true,
      accessToken: "persisted-token",
    });

    render(<LockScreen />);

    expect(screen.getByText("Screen Locked")).toBeInTheDocument();
    expect(screen.getByText(/Cashier One/)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe("persisted-token");
    expect(useOutletStore.getState().activeOutletId).toBe(7);
  });

  it("shows password unlock CTA when API offline and PIN not cached", async () => {
    useOfflineSyncStore.setState({ isOnline: false });
    useAuthStore.setState({
      user: {
        id: "1",
        name: "Cashier One",
        email: "cashier@example.com",
        role: "Cashier",
        outletIds: [7],
        pinSet: true,
        permissions: [],
        permissionCodes: [],
      },
      locked: true,
      accessToken: "persisted-token",
    });

    render(<LockScreen />);
    expect(await screen.findByText(/use login password/i)).toBeInTheDocument();
  });
});
