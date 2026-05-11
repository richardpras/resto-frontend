import { PERMISSIONS, type AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

function hasAnyPermission(user: AuthUser | null, perms: string[]): boolean {
  if (!user) return false;
  return perms.some((perm) => user.permissions.includes(perm));
}

export function canAccessSettings(user: AuthUser | null): boolean {
  return hasAnyPermission(user, [PERMISSIONS.SETTINGS, "settings.view", "settings.update"]);
}

export function canAccessCRM(user: AuthUser | null): boolean {
  return hasAnyPermission(user, [PERMISSIONS.MEMBERS, PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD_ALL, PERMISSIONS.DASHBOARD_OWN]);
}

export function canAccessMonitoring(user: AuthUser | null): boolean {
  return hasAnyPermission(user, [PERMISSIONS.POS, PERMISSIONS.DASHBOARD_ALL, PERMISSIONS.DASHBOARD_OWN]);
}

export function canAccessHardwareBridge(user: AuthUser | null): boolean {
  return canAccessSettings(user);
}

export function canAccessPrinterAdmin(user: AuthUser | null): boolean {
  return canAccessSettings(user);
}

export function getUserCapabilities(user: AuthUser | null): {
  settings: boolean;
  crm: boolean;
  monitoring: boolean;
  hardwareBridge: boolean;
  printerAdmin: boolean;
} {
  const settings = canAccessSettings(user);
  return {
    settings,
    crm: canAccessCRM(user),
    monitoring: canAccessMonitoring(user),
    hardwareBridge: canAccessHardwareBridge(user),
    printerAdmin: canAccessPrinterAdmin(user),
  };
}

export function selectUserCapabilities(): ReturnType<typeof getUserCapabilities> {
  return getUserCapabilities(useAuthStore.getState().user);
}

