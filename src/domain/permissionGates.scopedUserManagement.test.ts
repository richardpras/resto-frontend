import { describe, expect, it } from "vitest";
import {
  canAccessUserManagement,
  canManageMerchantSettings,
  canManageRolesAndPermissions,
  canViewSettingsTab,
} from "@/domain/permissionGates";
import type { AuthUser } from "@/stores/authStore";

const ownerUser: AuthUser = {
  id: "1",
  name: "Owner",
  email: "owner@test.local",
  role: "Owner",
  outletIds: [1],
  pinSet: true,
  permissionCodes: [
    "settings.view",
    "settings.update",
    "users.view",
    "users.create",
    "users.assign_roles",
  ],
  permissions: [],
};

const adminUser: AuthUser = {
  id: "2",
  name: "Admin",
  email: "admin@test.local",
  role: "Manager",
  outletIds: [1],
  pinSet: true,
  permissionCodes: ["users.manage", "merchant.manage", "settings.manage", "settings.view"],
  permissions: [],
};

describe("scoped user management gates", () => {
  it("owner can access user management but not role admin", () => {
    expect(canAccessUserManagement(ownerUser)).toBe(true);
    expect(canManageRolesAndPermissions(ownerUser)).toBe(false);
  });

  it("admin can access full user management", () => {
    expect(canAccessUserManagement(adminUser)).toBe(true);
    expect(canManageRolesAndPermissions(adminUser)).toBe(true);
  });

  it("owner cannot view merchant settings tab", () => {
    expect(canViewSettingsTab("merchant", ownerUser)).toBe(false);
    expect(canViewSettingsTab("outlets", ownerUser)).toBe(true);
    expect(canManageMerchantSettings(ownerUser)).toBe(false);
  });

  it("admin can view merchant settings tab", () => {
    expect(canViewSettingsTab("merchant", adminUser)).toBe(true);
    expect(canManageMerchantSettings(adminUser)).toBe(true);
  });
});
