import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";

const mockVerifyScreenPin = vi.fn();
const mockVerifyLocal = vi.fn();
const mockCachePin = vi.fn();

vi.mock("@/lib/api-integration/userManagementEndpoints", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  verifyScreenPin: (...args: unknown[]) => mockVerifyScreenPin(...args),
}));

vi.mock("@/mobile/offline/offlineScreenPin", () => ({
  cachePasswordVerifier: vi.fn(async () => undefined),
  cacheScreenPinVerifier: (...args: unknown[]) => mockCachePin(...args),
  clearAllLocalUnlockVerifiers: vi.fn(async () => undefined),
  verifyPasswordLocally: vi.fn(async () => false),
  verifyScreenPinLocally: (...args: unknown[]) => mockVerifyLocal(...args),
  hasCachedScreenPinVerifier: vi.fn(async () => false),
  hasCachedPasswordVerifier: vi.fn(async () => false),
}));

vi.mock("@/lib/api-integration/client", () => ({
  ApiHttpError: class ApiHttpError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  setApiAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  getApiAccessToken: vi.fn(() => null),
}));

vi.mock("@/mobile/platform", () => ({
  isNativePosShell: () => false,
  isCapacitorNative: () => false,
  isNativeAndroid: () => false,
}));

describe("authStore screen lock offline", () => {
  beforeEach(() => {
    mockVerifyScreenPin.mockReset();
    mockVerifyLocal.mockReset();
    mockCachePin.mockReset();
    useOfflineSyncStore.setState({ isOnline: true });
    useAuthStore.setState({
      user: {
        id: "u1",
        name: "Cashier",
        email: "c@x.com",
        role: "Cashier",
        outletIds: [1],
        pinSet: true,
        permissions: [],
        permissionCodes: [],
      },
      locked: true,
      accessToken: "tok",
    });
  });

  it("uses local PIN verifier when offlineSyncStore reports offline", async () => {
    useOfflineSyncStore.setState({ isOnline: false });
    mockVerifyLocal.mockResolvedValue(true);
    const ok = await useAuthStore.getState().unlock("3456");
    expect(ok).toBe(true);
    expect(mockVerifyLocal).toHaveBeenCalledWith("u1", "3456");
    expect(mockVerifyScreenPin).not.toHaveBeenCalled();
    expect(useAuthStore.getState().locked).toBe(false);
  });

  it("seeds offline PIN cache via verify-screen-pin while online", async () => {
    useOfflineSyncStore.setState({ isOnline: true });
    mockVerifyScreenPin.mockResolvedValue(undefined);
    mockCachePin.mockResolvedValue(undefined);
    const result = await useAuthStore.getState().seedScreenPinForOffline("3456");
    expect(result).toEqual({ ok: true });
    expect(mockVerifyScreenPin).toHaveBeenCalledWith("3456");
    expect(mockCachePin).toHaveBeenCalledWith("u1", "3456");
  });

  it("refuses to seed PIN while API offline", async () => {
    useOfflineSyncStore.setState({ isOnline: false });
    const result = await useAuthStore.getState().seedScreenPinForOffline("3456");
    expect(result.ok).toBe(false);
    expect(mockVerifyScreenPin).not.toHaveBeenCalled();
  });
});
