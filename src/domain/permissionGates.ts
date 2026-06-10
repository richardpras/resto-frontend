import { PERMISSIONS, type AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

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
  | "payroll"
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
  "payroll",
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
  if (canViewEmployees(u)) tabs.push("employees");
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
