import { describe, expect, it } from "vitest";
import { PERMISSIONS, type AuthUser } from "@/stores/authStore";
import {
  canAccessStaffRoute,
  hasStaffAppAccess,
  resolveDefaultLandingPath,
  resolvePostLoginPath,
} from "@/domain/permissionGates";

function userWithCodes(...permissionCodes: string[]): AuthUser {
  return {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    role: "Cashier",
    outletIds: [1],
    permissionCodes,
    pinSet: true,
    permissions: permissionCodes.includes("pos.use") ? [PERMISSIONS.POS] : [],
  };
}

describe("permissionGates landing paths", () => {
  it("resolveDefaultLandingPath returns /pos for cashier without dashboard", () => {
    const user = userWithCodes("pos.use");
    expect(resolveDefaultLandingPath(user)).toBe("/pos");
    expect(hasStaffAppAccess(user)).toBe(true);
  });

  it("resolveDefaultLandingPath avoids / for users without dashboard access", () => {
    const user = userWithCodes("pos.use");
    expect(resolveDefaultLandingPath(user)).not.toBe("/");
  });

  it("resolveDefaultLandingPath returns /login when user has no module access", () => {
    const user = userWithCodes();
    expect(resolveDefaultLandingPath(user)).toBe("/login");
    expect(hasStaffAppAccess(user)).toBe(false);
  });

  it("resolvePostLoginPath rejects /login target and uses default landing", () => {
    const user = userWithCodes("pos.use");
    expect(resolvePostLoginPath(user, "/login")).toBe("/pos");
  });

  it("resolvePostLoginPath rejects forbidden deep links", () => {
    const user = userWithCodes("pos.use");
    expect(resolvePostLoginPath(user, "/settings")).toBe("/pos");
  });

  it("resolvePostLoginPath keeps allowed deep links", () => {
    const user = userWithCodes("pos.use", "settings.view");
    user.permissions = [PERMISSIONS.POS, PERMISSIONS.SETTINGS];
    expect(resolvePostLoginPath(user, "/pos")).toBe("/pos");
  });

  it("canAccessStaffRoute mirrors dashboard guard on /", () => {
    const dashboardUser = userWithCodes("dashboard.view");
    dashboardUser.permissions = [PERMISSIONS.MENU_DASHBOARD];
    const posUser = userWithCodes("pos.use");
    expect(canAccessStaffRoute(dashboardUser, "/")).toBe(true);
    expect(canAccessStaffRoute(posUser, "/")).toBe(false);
  });
});
