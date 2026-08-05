import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  cachePasswordVerifier,
  cacheScreenPinVerifier,
  clearAllLocalUnlockVerifiers,
  hasCachedPasswordVerifier,
  hasCachedScreenPinVerifier,
  hashScreenPinForLocalUnlock,
  verifyPasswordLocally,
  verifyScreenPinLocally,
} from "@/mobile/offline/offlineScreenPin";

const mem = new Map<string, string>();

vi.mock("@/mobile/secureStorage", () => ({
  getSecureValue: async (key: string) => mem.get(key) ?? null,
  setSecureValue: async (key: string, value: string) => {
    mem.set(key, value);
  },
  removeSecureValue: async (key: string) => {
    mem.delete(key);
  },
}));

describe("offlineScreenPin", () => {
  beforeEach(() => {
    mem.clear();
  });

  it("hashes deterministically per user", async () => {
    const a = await hashScreenPinForLocalUnlock("1", "1234");
    const b = await hashScreenPinForLocalUnlock("1", "1234");
    const c = await hashScreenPinForLocalUnlock("2", "1234");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("caches and verifies PIN locally", async () => {
    await cacheScreenPinVerifier("7", "3456");
    await expect(hasCachedScreenPinVerifier("7")).resolves.toBe(true);
    await expect(verifyScreenPinLocally("7", "3456")).resolves.toBe(true);
    await expect(verifyScreenPinLocally("7", "0000")).resolves.toBe(false);
  });

  it("caches password at login for emergency offline unlock", async () => {
    await cachePasswordVerifier("7", "wrwb123");
    await expect(hasCachedPasswordVerifier("7")).resolves.toBe(true);
    await expect(verifyPasswordLocally("7", "wrwb123")).resolves.toBe(true);
    await expect(verifyPasswordLocally("7", "wrong")).resolves.toBe(false);
  });

  it("clears all verifiers on logout path", async () => {
    await cacheScreenPinVerifier("7", "3456");
    await cachePasswordVerifier("7", "wrwb123");
    await clearAllLocalUnlockVerifiers("7");
    await expect(hasCachedScreenPinVerifier("7")).resolves.toBe(false);
    await expect(hasCachedPasswordVerifier("7")).resolves.toBe(false);
  });
});
