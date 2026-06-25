import { describe, expect, it } from "vitest";
import { expandPermissionCodes, type AuthUser } from "@/stores/authStore";
import { canAccessSettings, getUserCapabilities } from "@/domain/accessControl";
import { resolveDefaultLandingPath, resolvePostLoginPath } from "@/domain/permissionGates";

function userWithCodes(codes: string[], role: AuthUser["role"] = "Manager"): AuthUser {
  return {
    id: "1",
    name: "Test",
    email: "test@wrwb.demo",
    role,
    outletIds: [1],
    pinSet: false,
    permissionCodes: [...codes],
    permissions: expandPermissionCodes(codes),
  };
}

describe("accessControl", () => {
  it("allows settings page for view/update without platform manage", () => {
    const owner = userWithCodes(["settings.view", "settings.update"], "Owner");
    expect(canAccessSettings(owner)).toBe(true);
    expect(getUserCapabilities(owner).platformSettings).toBe(false);
    expect(getUserCapabilities(owner).hardwareBridge).toBe(true);
  });

  it("reserves platform settings for settings.manage only", () => {
    const admin = userWithCodes(["settings.manage"]);
    expect(getUserCapabilities(admin).platformSettings).toBe(true);
    expect(getUserCapabilities(admin).settings).toBe(true);
  });

  it("sends kasir without dashboard to POS landing", () => {
    const kasir = userWithCodes(["pos.use", "tables.view", "finance.shift_close"], "Cashier");
    expect(resolveDefaultLandingPath(kasir)).toBe("/pos");
    expect(resolvePostLoginPath(kasir, "/")).toBe("/pos");
  });

  it("sends kitchen staff to kitchen landing", () => {
    const kitchen = userWithCodes(["kitchen.use"], "Kitchen");
    expect(resolveDefaultLandingPath(kitchen)).toBe("/kitchen");
  });
});
