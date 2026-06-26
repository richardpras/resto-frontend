import { PERMISSIONS, type AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

export function hasPermissionCode(user: AuthUser | null, code: string): boolean {
  if (!user) return false;
  return (user.permissionCodes ?? []).includes(code);
}

export function hasAnyPermissionCode(user: AuthUser | null, codes: string[]): boolean {
  if (!user) return false;
  const granted = new Set(user.permissionCodes ?? []);
  return codes.some((code) => granted.has(code));
}

export function canAccessDashboard(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, [
    "dashboard.view",
    "dashboard.view_own_outlet",
    "dashboard.view_all_outlets",
    "dashboard.manage",
    "reports.view",
  ]);
}

export function canAccessNotifications(user?: AuthUser | null): boolean {
  return canAccessDashboard(user);
}

export function canAccessSettingsPage(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, ["settings.view", "settings.update", "settings.manage"]);
}

export function canManagePlatformSettings(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasPermissionCode(u, "settings.manage");
}

export function canUpdateOperationalSettings(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, ["settings.update", "settings.manage"]);
}

export function canAccessUsersAdmin(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasPermissionCode(u, "users.manage");
}

export function canAccessUserManagement(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, ["users.manage", "users.view"]);
}

export function canManageRolesAndPermissions(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasPermissionCode(u, "users.manage");
}

export function canCreateUsers(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, ["users.manage", "users.create"]);
}

export function canAssignUserRoles(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, ["users.manage", "users.assign_roles"]);
}

export function canManageMerchantSettings(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, ["merchant.manage", "settings.manage"]);
}

export function canViewFoodCost(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermissionCode(u, ["foodcost.view", "recipe.view"]);
}

export function canApprovePurchases(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasPermissionCode(u, "purchase.approve");
}

export function canDeleteOutlet(user?: AuthUser | null): boolean {
  return canManagePlatformSettings(user);
}

export type SettingsTabKey =
  | "merchant"
  | "outlets"
  | "taxes"
  | "printers"
  | "numbering"
  | "receipt"
  | "warehouses"
  | "banks"
  | "payments"
  | "system"
  | "integration";

export function canViewSettingsTab(tab: SettingsTabKey, user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  const operational = canUpdateOperationalSettings(u);
  const platform = canManagePlatformSettings(u);
  const readSettings = canAccessSettingsPage(u);

  switch (tab) {
    case "taxes":
    case "printers":
    case "payments":
      return operational;
    case "merchant":
      return canManageMerchantSettings(u);
    case "outlets":
      return readSettings;
    case "numbering":
    case "receipt":
    case "warehouses":
    case "banks":
    case "system":
    case "integration":
      return platform;
    default:
      return false;
  }
}

export function resolveDefaultLandingPath(user: AuthUser | null): string {
  if (!user) return "/login";
  if (hasPermissionCode(user, "pos.use")) return "/pos";
  if (hasPermissionCode(user, "kitchen.use")) return "/kitchen";
  if (canAccessDashboard(user)) return "/";
  if (canAccessSettingsPage(user)) return "/settings";
  if (hasPermissionCode(user, "reports.view")) return "/reports";
  if (hasPermissionCode(user, "accounting.manage")) return "/accounting";
  if (canAccessPayrollModule(user)) return "/hr/payroll/engine";
  if (canViewEmployees(user)) return "/hr/employees";
  return "/login";
}

/** True when the user can reach at least one staff module (avoids login ↔ dashboard loops). */
export function hasStaffAppAccess(user: AuthUser | null): boolean {
  if (!user) return false;
  return resolveDefaultLandingPath(user) !== "/login";
}

function staffPath(user: AuthUser, path: string): string {
  return (path.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";
}

/** Mirrors App.tsx route guards for safe post-login redirects. */
export function canAccessStaffRoute(user: AuthUser | null, pathname: string): boolean {
  if (!user) return false;
  const path = staffPath(user, pathname);
  if (path === "/login") return false;
  if (path === "/") return canAccessDashboard(user);
  if (path === "/notifications") return canAccessNotifications(user);
  if (path === "/pos" || path.startsWith("/pos/")) return hasAnyPermission(user, [PERMISSIONS.POS]);
  if (path === "/cashier" || path.startsWith("/cashier/")) return hasAnyPermission(user, [PERMISSIONS.POS]);
  if (path === "/kitchen" || path.startsWith("/kitchen/")) return hasAnyPermission(user, [PERMISSIONS.KITCHEN]);
  if (path === "/qr-orders" || path.startsWith("/qr-orders/")) {
    return hasAnyPermission(user, [PERMISSIONS.QR_ORDERS, PERMISSIONS.POS]);
  }
  if (path === "/orders" || path.startsWith("/orders/")) return hasAnyPermission(user, [PERMISSIONS.POS]);
  if (path === "/tables" || path.startsWith("/tables/")) {
    return hasAnyPermission(user, [PERMISSIONS.TABLES, PERMISSIONS.TABLES_MANAGE]);
  }
  if (path.startsWith("/reservations")) return hasAnyPermission(user, [PERMISSIONS.POS]);
  if (path.startsWith("/menu")) {
    if (path.startsWith("/menu/costing")) return canViewFoodCost(user);
    return hasAnyPermission(user, [PERMISSIONS.MENU]);
  }
  if (path === "/inventory" || path.startsWith("/inventory/")) {
    return hasAnyPermission(user, [PERMISSIONS.INVENTORY]);
  }
  if (path === "/suppliers" || path.startsWith("/suppliers/")) {
    return hasAnyPermission(user, [PERMISSIONS.SUPPLIERS]);
  }
  if (
    path.startsWith("/members")
    || path.startsWith("/customers")
    || path.startsWith("/loyalty")
    || path === "/gift-cards"
  ) {
    return hasAnyPermission(user, [PERMISSIONS.MEMBERS, PERMISSIONS.CUSTOMERS]);
  }
  if (path === "/purchases" || path.startsWith("/purchases/")) {
    return hasAnyPermission(user, [PERMISSIONS.PURCHASE]);
  }
  if (path === "/shift-close" || path.startsWith("/shift-close/")) {
    return hasAnyPermission(user, [PERMISSIONS.FINANCE_SHIFT_CLOSE]);
  }
  if (path === "/users" || path.startsWith("/users/")) return canAccessUserManagement(user);
  if (path.startsWith("/hr/")) {
    return canAccessPayrollModule(user) || canViewEmployees(user) || canAccessUsersAdmin(user);
  }
  if (path === "/accounting" || path.startsWith("/accounting/")) {
    return hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]);
  }
  if (path === "/reports" || path.startsWith("/reports/") || path === "/executive-dashboard") {
    return hasAnyPermission(user, [PERMISSIONS.REPORTS]);
  }
  if (path.startsWith("/settings")) {
    if (path.startsWith("/settings/payments/health")) return canManagePlatformSettings(user);
    if (path.startsWith("/settings/production-stations")) return canUpdateOperationalSettings(user);
    return canAccessSettingsPage(user);
  }
  if (path.startsWith("/system/")) return canManagePlatformSettings(user);
  if (path === "/dashboard/menu" || path.startsWith("/dashboard/")) {
    return hasAnyPermission(user, [PERMISSIONS.MENU_DASHBOARD, PERMISSIONS.REPORTS]);
  }
  return false;
}

export function resolvePostLoginPath(user: AuthUser | null, requestedPath?: string): string {
  if (!user) return "/login";
  const raw = (requestedPath ?? "/").trim() || "/";
  const normalized = raw === "/login" ? "/" : raw;
  if (canAccessStaffRoute(user, normalized)) {
    return normalized;
  }
  return resolveDefaultLandingPath(user);
}

export function hasAnyPermission(user: AuthUser | null, perms: string[]): boolean {
  if (!user) return false;
  return perms.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(user: AuthUser | null, perms: string[]): boolean {
  if (!user) return false;
  return perms.every((p) => user.permissions.includes(p));
}

/** General Ledger, P&L, Trial Balance, Balance Sheet, Cash Flow — requires accounting.manage and reports.view. */
export function canViewFinancialStatements(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAllPermissions(u, [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS]);
}

export const FINANCIAL_STATEMENT_RESTRICTED_MSG =
  "Financial statement reports require both accounting.manage and reports.view permissions.";

export function canReconcilePayments(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, [PERMISSIONS.FINANCE_RECONCILE]);
}

/** Full payroll suite (runs, closing, posting, payslips, etc.) — payroll.manage only. */
export function hasPayrollFullAccess(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, [PERMISSIONS.PAYROLL]);
}

export function canViewAttendance(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, [PERMISSIONS.ATTENDANCE, "attendance.manage"]);
}

export function canManageAttendance(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["attendance.manage"]);
}

export function canViewShifts(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, [PERMISSIONS.SHIFTS, "shift.manage"]);
}

export function canManageShifts(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["shift.manage"]);
}

export function canViewSchedule(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, [PERMISSIONS.SCHEDULING, "schedule.manage"]);
}

export function canManageSchedule(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["schedule.manage"]);
}

export function canManageLeave(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, [PERMISSIONS.LEAVE]);
}

export function canViewOvertime(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, [PERMISSIONS.OVERTIME, "overtime.manage"]);
}

export function canManageOvertime(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["overtime.manage"]);
}

export function canViewLoans(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["loans.view", "loans.manage"]);
}

export function canManageLoans(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["loans.manage"]);
}

export function canManageCashAdvance(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["cash_advance.manage"]);
}

/** HRM employee directory — employees.view or employees.manage. */
export function canViewEmployees(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["employees.view", "employees.manage", PERMISSIONS.EMPLOYEES]);
}

export function canViewMenuAnalytics(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["analytics.view", PERMISSIONS.MENU_DASHBOARD, PERMISSIONS.REPORTS]);
}

export function canViewMenuForecasting(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["forecasting.view", PERMISSIONS.MENU_DASHBOARD]);
}

export function canViewProduction(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user;
  return hasAnyPermission(u, ["production.view", "production.manage", PERMISSIONS.COST_VIEW]);
}

export type PayrollTabKey =
  | "employees"
  | "shift-assignments"
  | "scheduling"
  | "attendance"
  | "attendance-review"
  | "leave"
  | "overtime"
  | "preparation"
  | "engine"
  | "adjustments"
  | "shifts"
  | "loans"
  | "cash-advances"
  | "payslips"
  | "bpjs"
  | "tax"
  | "reimbursements"
  | "closing"
  | "posting";

const PAYROLL_FULL_TABS: PayrollTabKey[] = [
  "preparation",
  "engine",
  "adjustments",
  "payslips",
  "bpjs",
  "tax",
  "reimbursements",
  "closing",
  "posting",
];

export function getVisiblePayrollTabs(user?: AuthUser | null): PayrollTabKey[] {
  const u = user ?? useAuthStore.getState().user;
  const tabs: PayrollTabKey[] = [];

  if (hasPayrollFullAccess(u)) {
    tabs.push(...PAYROLL_FULL_TABS);
  }
  if (canViewSchedule(u)) tabs.push("shift-assignments", "scheduling");
  if (canViewAttendance(u)) tabs.push("attendance", "attendance-review");
  if (canManageLeave(u)) tabs.push("leave");
  if (canViewOvertime(u)) tabs.push("overtime");
  if (canViewShifts(u)) tabs.push("shifts");
  if (canViewLoans(u)) tabs.push("loans");
  if (canManageCashAdvance(u)) tabs.push("cash-advances");

  return [...new Set(tabs)];
}

/** True when the user can open at least one Payroll module tab (route/sidebar guard). */
export function canAccessPayrollModule(user?: AuthUser | null): boolean {
  return getVisiblePayrollTabs(user).length > 0;
}
