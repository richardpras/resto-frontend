import { describe, expect, it } from "vitest";
import { isSessionRestoreReady } from "@/stores/authStore";

describe("authStore session restore readiness", () => {
  it("is ready when restore finished", () => {
    expect(isSessionRestoreReady("token", "done")).toBe(true);
  });

  it("is ready when there is no token and status is idle", () => {
    expect(isSessionRestoreReady(null, "idle")).toBe(true);
  });

  it("is not ready while restore is pending with a token", () => {
    expect(isSessionRestoreReady("token", "pending")).toBe(false);
  });
});
