import {
  LayoutDashboard, ShoppingCart, ChefHat, QrCode, Armchair, CalendarDays, Package, UtensilsCrossed,
  ClipboardList, Megaphone, Users, UserCog, BarChart3, BookOpen, Settings,
  Truck, UserCircle, Banknote, ListOrdered, Gift, Building2, Briefcase, LockKeyhole, Bell,
} from "lucide-react";
import { PERMISSIONS } from "@/stores/authStore";
import { canAccessPayrollModule, canViewEmployees, canViewFinancialStatements, getVisiblePayrollTabs, type PayrollTabKey } from "@/domain/permissionGates";
import { isPromotionsModuleEnabled } from "@/domain/featureFlags";
import type { AuthUser } from "@/stores/authStore";
import type { SidebarNavItem } from "./sidebarNavTypes";

const PAYROLL_TAB_KEYS: Record<PayrollTabKey, string> = {
  payroll: "nav.payroll.overview",
  employees: "nav.payroll.employees",
  "shift-assignments": "nav.payroll.assignments",
  scheduling: "nav.payroll.scheduling",
  attendance: "nav.payroll.attendance",
  "attendance-review": "nav.payroll.review",
  leave: "nav.payroll.leave",
  overtime: "nav.payroll.overtime",
  preparation: "nav.payroll.preparation",
  engine: "nav.payroll.engine",
  adjustments: "nav.payroll.adjustments",
  shifts: "nav.payroll.shifts",
  loans: "nav.payroll.loans",
  "cash-advances": "nav.payroll.cashAdvances",
  payslips: "nav.payroll.payslips",
  bpjs: "nav.payroll.bpjs",
  tax: "nav.payroll.tax",
  reimbursements: "nav.payroll.reimbursements",
  closing: "nav.payroll.closing",
  posting: "nav.payroll.posting",
};

function nav(titleKey: string, rest: Omit<SidebarNavItem, "title" | "titleKey">): SidebarNavItem {
  return { title: "", titleKey, ...rest };
}

function buildPayrollChildren(user: AuthUser | null): SidebarNavItem[] {
  return getVisiblePayrollTabs(user).map((tab) =>
    nav(PAYROLL_TAB_KEYS[tab], { href: `/payroll?tab=${tab}` }),
  );
}

const ACCOUNTING_OPERATIONAL: SidebarNavItem[] = [
  nav("nav.accounting.chartOfAccounts", { href: "/accounting?tab=coa", permission: PERMISSIONS.ACCOUNTING }),
  nav("nav.accounting.journalEntries", { href: "/accounting?tab=journal", permission: PERMISSIONS.ACCOUNTING }),
  nav("nav.accounting.periods", { href: "/accounting?tab=periods", permission: PERMISSIONS.ACCOUNTING }),
  nav("nav.accounting.health", { href: "/accounting?tab=health", permission: PERMISSIONS.ACCOUNTING }),
  nav("nav.accounting.reconciliation", { href: "/accounting?tab=recon", permission: PERMISSIONS.ACCOUNTING }),
];

const ACCOUNTING_FINANCIAL: SidebarNavItem[] = [
  nav("nav.accounting.generalLedger", { href: "/accounting?tab=ledger", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] }),
  nav("nav.accounting.trialBalance", { href: "/accounting?tab=tb", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] }),
  nav("nav.accounting.profitLoss", { href: "/accounting?tab=pl", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] }),
  nav("nav.accounting.balanceSheet", { href: "/accounting?tab=bs", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] }),
  nav("nav.accounting.cashFlow", { href: "/accounting?tab=cf", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] }),
];

function buildAccountingChildren(user: AuthUser | null): SidebarNavItem[] {
  const children: SidebarNavItem[] = [...ACCOUNTING_OPERATIONAL];
  if (canViewFinancialStatements(user)) {
    const reconIndex = children.findIndex((c) => c.href === "/accounting?tab=recon");
    if (reconIndex >= 0) {
      children.splice(reconIndex, 0, ...ACCOUNTING_FINANCIAL);
    } else {
      children.push(...ACCOUNTING_FINANCIAL);
    }
  }
  return children;
}

const PURCHASES_CHILDREN: SidebarNavItem[] = [
  nav("nav.purchases.requests", { href: "/purchases?tab=pr", permission: PERMISSIONS.PURCHASE }),
  nav("nav.purchases.orders", { href: "/purchases?tab=po", permission: PERMISSIONS.PURCHASE }),
  nav("nav.purchases.receiving", { href: "/purchases?tab=grn", permission: PERMISSIONS.PURCHASE }),
  nav("nav.purchases.invoices", { href: "/purchases?tab=inv", permission: PERMISSIONS.PURCHASE }),
  nav("nav.purchases.match", { href: "/purchases?tab=match", permission: PERMISSIONS.PURCHASE }),
  nav("nav.purchases.posting", { href: "/purchases?tab=posting", permission: PERMISSIONS.PURCHASE }),
  nav("nav.purchases.analytics", { href: "/purchases?tab=analytics", permission: PERMISSIONS.PURCHASE }),
  nav("nav.purchases.payments", { href: "/purchases?tab=pay", permission: PERMISSIONS.PURCHASE }),
];

const REPORTS_CHILDREN: SidebarNavItem[] = [
  nav("nav.reports.hub", { href: "/reports", permission: PERMISSIONS.REPORTS }),
  nav("nav.reports.executiveSales", { href: "/reports/executive-sales", permission: PERMISSIONS.REPORTS }),
  nav("nav.reports.executiveDashboard", { href: "/executive-dashboard", permission: PERMISSIONS.REPORTS }),
  nav("nav.reports.systemHealth", { href: "/system/health", permission: PERMISSIONS.SETTINGS }),
  nav("nav.reports.auditCenter", { href: "/system/audit", permission: PERMISSIONS.SETTINGS }),
  nav("nav.reports.failedJobs", { href: "/system/failed-jobs", permission: PERMISSIONS.SETTINGS }),
  nav("nav.reports.bugReports", { href: "/system/bug-reports", permission: PERMISSIONS.SETTINGS }),
];

export function buildMainItems(): SidebarNavItem[] {
  return [
    nav("nav.dashboard", { href: "/", icon: LayoutDashboard }),
    nav("nav.notificationCenter", { href: "/notifications", icon: Bell }),
    nav("nav.menuIntelligence", { href: "/dashboard/menu", icon: BarChart3, permission: PERMISSIONS.MENU_DASHBOARD }),
    nav("nav.posCashier", { href: "/pos", icon: ShoppingCart, permission: PERMISSIONS.POS }),
    nav("nav.openBills", { href: "/cashier", icon: Banknote, permission: PERMISSIONS.POS }),
    nav("nav.shiftClose", { href: "/shift-close", icon: LockKeyhole, permission: PERMISSIONS.FINANCE_SHIFT_CLOSE }),
    nav("nav.orders", { href: "/orders", icon: ListOrdered, permission: PERMISSIONS.POS }),
    nav("nav.kitchenDisplay", { href: "/kitchen", icon: ChefHat, permission: PERMISSIONS.KITCHEN }),
    nav("nav.qrOrders", { href: "/qr-orders", icon: QrCode, permission: PERMISSIONS.QR_ORDERS }),
    nav("nav.tables", { href: "/tables", icon: Armchair, permission: PERMISSIONS.TABLES }),
    nav("nav.reservations", { href: "/reservations", icon: CalendarDays, permission: PERMISSIONS.POS }),
    nav("nav.reservationOps", { href: "/reservations/operations", icon: BarChart3, permission: PERMISSIONS.POS }),
  ];
}

export function buildManagementItems(_user: AuthUser | null): SidebarNavItem[] {
  const items: SidebarNavItem[] = [
    {
      ...nav("nav.menu", {
        icon: UtensilsCrossed,
        children: [
          nav("nav.menuItems", { href: "/menu", permission: PERMISSIONS.MENU }),
          nav("nav.menuCosting", { href: "/menu/costing", permission: PERMISSIONS.COST_VIEW }),
        ],
      }),
    },
    nav("nav.inventory", { href: "/inventory", icon: Package, permission: PERMISSIONS.INVENTORY }),
    nav("nav.suppliers", { href: "/suppliers", icon: Truck, permission: PERMISSIONS.SUPPLIERS }),
    nav("nav.members", { href: "/members", icon: UserCircle, permission: PERMISSIONS.MEMBERS }),
    nav("nav.customers", { href: "/customers", icon: UserCircle, permission: PERMISSIONS.CUSTOMERS }),
    nav("nav.loyaltyDashboard", { href: "/loyalty-dashboard", icon: Gift, permission: PERMISSIONS.LOYALTY_DASHBOARD }),
    nav("nav.loyaltyPrograms", { href: "/loyalty-programs", icon: Gift, permission: PERMISSIONS.MEMBERS }),
    nav("nav.giftCards", { href: "/gift-cards", icon: Gift, permission: PERMISSIONS.GIFT_CARDS }),
    nav("nav.purchasesMenu", { icon: ClipboardList, permission: PERMISSIONS.PURCHASE, children: PURCHASES_CHILDREN }),
  ];

  if (isPromotionsModuleEnabled()) {
    items.push(nav("nav.promotions", { href: "/promotions", icon: Megaphone, permission: PERMISSIONS.PROMOTIONS }));
  }

  return items;
}

export function buildAdminItems(user: AuthUser | null): SidebarNavItem[] {
  const payrollChildren = buildPayrollChildren(user);
  const accountingChildren = buildAccountingChildren(user);

  const items: SidebarNavItem[] = [
    nav("nav.usersRoles", { href: "/users", icon: UserCog, permission: PERMISSIONS.USERS }),
    nav("nav.employees", { href: "/employees", icon: Users, accessCheck: (u) => canViewEmployees(u) }),
    nav("nav.departments", { href: "/departments", icon: Building2, permission: PERMISSIONS.USERS }),
    nav("nav.positions", { href: "/positions", icon: Briefcase, permission: PERMISSIONS.USERS }),
  ];

  if (payrollChildren.length > 0) {
    items.push(
      nav("nav.payrollMenu", { icon: Users, accessCheck: (u) => canAccessPayrollModule(u), children: payrollChildren }),
    );
  }

  if (accountingChildren.length > 0) {
    items.push(
      nav("nav.accountingMenu", { icon: BookOpen, permission: PERMISSIONS.ACCOUNTING, children: accountingChildren }),
    );
  }

  items.push(nav("nav.reportsMenu", { icon: BarChart3, children: REPORTS_CHILDREN }));
  items.push(nav("nav.settings", { href: "/settings", icon: Settings, permission: PERMISSIONS.SETTINGS }));

  return items;
}
