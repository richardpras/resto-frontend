import { PERMISSIONS, type AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";
import {
  canAccessDashboard,
  canAccessSettingsPage,
  canManagePlatformSettings,
  canUpdateOperationalSettings,
  hasAnyPermissionCode,
} from "@/domain/permissionGates";

function hasAnyPermission(user: AuthUser | null, perms: string[]): boolean {
  if (!user) return false;
  return perms.some((perm) => user.permissions.includes(perm));
}

/** @deprecated Use canAccessSettingsPage from permissionGates for route guards. */
export function canAccessSettings(user: AuthUser | null): boolean {
  return canAccessSettingsPage(user);
}

export function canAccessCRM(user: AuthUser | null): boolean {
  return hasAnyPermission(user, [PERMISSIONS.MEMBERS, PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD_ALL, PERMISSIONS.DASHBOARD_OWN]);
}

export function canAccessMonitoring(user: AuthUser | null): boolean {
  return (
    hasAnyPermissionCode(user, ["pos.use"]) ||
    hasAnyPermission(user, [PERMISSIONS.DASHBOARD_ALL, PERMISSIONS.DASHBOARD_OWN]) ||
    canAccessDashboard(user)
  );
}

export function canAccessHardwareBridge(user: AuthUser | null): boolean {
  return canUpdateOperationalSettings(user);
}

export function canAccessPrinterAdmin(user: AuthUser | null): boolean {
  return canUpdateOperationalSettings(user);
}

export function getUserCapabilities(user: AuthUser | null): {
  settings: boolean;
  platformSettings: boolean;
  crm: boolean;
  monitoring: boolean;
  hardwareBridge: boolean;
  printerAdmin: boolean;
} {
  return {
    settings: canAccessSettingsPage(user),
    platformSettings: canManagePlatformSettings(user),
    crm: canAccessCRM(user),
    monitoring: canAccessMonitoring(user),
    hardwareBridge: canAccessHardwareBridge(user),
    printerAdmin: canAccessPrinterAdmin(user),
  };
}

export function selectUserCapabilities(): ReturnType<typeof getUserCapabilities> {
  return getUserCapabilities(useAuthStore.getState().user);
}
