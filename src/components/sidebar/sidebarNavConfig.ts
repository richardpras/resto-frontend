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

const PAYROLL_TAB_LABELS: Record<PayrollTabKey, string> = {
  payroll: "Overview",
  employees: "Employees",
  "shift-assignments": "Assignments",
  scheduling: "Scheduling",
  attendance: "Attendance",
  "attendance-review": "Review",
  leave: "Leave",
  overtime: "Overtime",
  preparation: "Preparation",
  engine: "Engine",
  adjustments: "Adjustments",
  shifts: "Shifts",
  loans: "Loans",
  "cash-advances": "Cash Advances",
  payslips: "Payslips",
  bpjs: "BPJS",
  tax: "Tax",
  reimbursements: "Reimbursements",
  closing: "Closing",
  posting: "Posting",
};

function buildPayrollChildren(user: AuthUser | null): SidebarNavItem[] {
  return getVisiblePayrollTabs(user).map((tab) => ({
    title: PAYROLL_TAB_LABELS[tab],
    href: `/payroll?tab=${tab}`,
  }));
}

const ACCOUNTING_OPERATIONAL: SidebarNavItem[] = [
  { title: "Chart of Accounts", href: "/accounting?tab=coa", permission: PERMISSIONS.ACCOUNTING },
  { title: "Journal Entries", href: "/accounting?tab=journal", permission: PERMISSIONS.ACCOUNTING },
  { title: "Periods", href: "/accounting?tab=periods", permission: PERMISSIONS.ACCOUNTING },
  { title: "Health", href: "/accounting?tab=health", permission: PERMISSIONS.ACCOUNTING },
  { title: "Reconciliation", href: "/accounting?tab=recon", permission: PERMISSIONS.ACCOUNTING },
];

const ACCOUNTING_FINANCIAL: SidebarNavItem[] = [
  { title: "General Ledger", href: "/accounting?tab=ledger", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] },
  { title: "Trial Balance", href: "/accounting?tab=tb", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] },
  { title: "Profit & Loss", href: "/accounting?tab=pl", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] },
  { title: "Balance Sheet", href: "/accounting?tab=bs", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] },
  { title: "Cash Flow", href: "/accounting?tab=cf", permissionsAll: [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] },
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
  { title: "Purchase Requests", href: "/purchases?tab=pr", permission: PERMISSIONS.PURCHASE },
  { title: "Purchase Orders", href: "/purchases?tab=po", permission: PERMISSIONS.PURCHASE },
  { title: "Goods Receiving", href: "/purchases?tab=grn", permission: PERMISSIONS.PURCHASE },
  { title: "Supplier Invoices", href: "/purchases?tab=inv", permission: PERMISSIONS.PURCHASE },
  { title: "3-Way Match", href: "/purchases?tab=match", permission: PERMISSIONS.PURCHASE },
  { title: "Posting", href: "/purchases?tab=posting", permission: PERMISSIONS.PURCHASE },
  { title: "Analytics", href: "/purchases?tab=analytics", permission: PERMISSIONS.PURCHASE },
  { title: "Payments", href: "/purchases?tab=pay", permission: PERMISSIONS.PURCHASE },
];

const REPORTS_CHILDREN: SidebarNavItem[] = [
  { title: "Reports Hub", href: "/reports", permission: PERMISSIONS.REPORTS },
  { title: "Executive Sales", href: "/reports/executive-sales", permission: PERMISSIONS.REPORTS },
  { title: "Executive Dashboard", href: "/executive-dashboard", permission: PERMISSIONS.REPORTS },
  { title: "System Health", href: "/system/health", permission: PERMISSIONS.SETTINGS },
  { title: "Audit Center", href: "/system/audit", permission: PERMISSIONS.SETTINGS },
  { title: "Failed Jobs", href: "/system/failed-jobs", permission: PERMISSIONS.SETTINGS },
  { title: "Bug Reports", href: "/system/bug-reports", permission: PERMISSIONS.SETTINGS },
];

export function buildMainItems(): SidebarNavItem[] {
  return [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Notification Center", href: "/notifications", icon: Bell },
    { title: "Menu Intelligence", href: "/dashboard/menu", icon: BarChart3, permission: PERMISSIONS.MENU_DASHBOARD },
    { title: "POS Cashier", href: "/pos", icon: ShoppingCart, permission: PERMISSIONS.POS },
    { title: "Open bills", href: "/cashier", icon: Banknote, permission: PERMISSIONS.POS },
    { title: "Shift Close", href: "/shift-close", icon: LockKeyhole, permission: PERMISSIONS.FINANCE_SHIFT_CLOSE },
    { title: "Orders", href: "/orders", icon: ListOrdered, permission: PERMISSIONS.POS },
    { title: "Kitchen Display", href: "/kitchen", icon: ChefHat, permission: PERMISSIONS.KITCHEN },
    { title: "QR Orders", href: "/qr-orders", icon: QrCode, permission: PERMISSIONS.QR_ORDERS },
    { title: "Tables", href: "/tables", icon: Armchair, permission: PERMISSIONS.TABLES },
    { title: "Reservations", href: "/reservations", icon: CalendarDays, permission: PERMISSIONS.POS },
    { title: "Reservation Ops", href: "/reservations/operations", icon: BarChart3, permission: PERMISSIONS.POS },
  ];
}

export function buildManagementItems(_user: AuthUser | null): SidebarNavItem[] {
  const items: SidebarNavItem[] = [
    {
      title: "Menu",
      icon: UtensilsCrossed,
      children: [
        { title: "Menu Items", href: "/menu", permission: PERMISSIONS.MENU },
        { title: "Menu Costing", href: "/menu/costing", permission: PERMISSIONS.COST_VIEW },
      ],
    },
    { title: "Inventory", href: "/inventory", icon: Package, permission: PERMISSIONS.INVENTORY },
    { title: "Suppliers", href: "/suppliers", icon: Truck, permission: PERMISSIONS.SUPPLIERS },
    { title: "Members", href: "/members", icon: UserCircle, permission: PERMISSIONS.MEMBERS },
    { title: "Customers", href: "/customers", icon: UserCircle, permission: PERMISSIONS.CUSTOMERS },
    { title: "Loyalty Dashboard", href: "/loyalty-dashboard", icon: Gift, permission: PERMISSIONS.LOYALTY_DASHBOARD },
    { title: "Loyalty Programs", href: "/loyalty-programs", icon: Gift, permission: PERMISSIONS.MEMBERS },
    { title: "Gift Cards", href: "/gift-cards", icon: Gift, permission: PERMISSIONS.GIFT_CARDS },
    {
      title: "Purchases",
      icon: ClipboardList,
      permission: PERMISSIONS.PURCHASE,
      children: PURCHASES_CHILDREN,
    },
  ];

  if (isPromotionsModuleEnabled()) {
    items.push({ title: "Promotions", href: "/promotions", icon: Megaphone, permission: PERMISSIONS.PROMOTIONS });
  }

  return items;
}

export function buildAdminItems(user: AuthUser | null): SidebarNavItem[] {
  const payrollChildren = buildPayrollChildren(user);
  const accountingChildren = buildAccountingChildren(user);

  const items: SidebarNavItem[] = [
    { title: "Users & Roles", href: "/users", icon: UserCog, permission: PERMISSIONS.USERS },
    { title: "Employees", href: "/employees", icon: Users, accessCheck: (u) => canViewEmployees(u) },
    { title: "Departments", href: "/departments", icon: Building2, permission: PERMISSIONS.USERS },
    { title: "Positions", href: "/positions", icon: Briefcase, permission: PERMISSIONS.USERS },
  ];

  if (payrollChildren.length > 0) {
    items.push({
      title: "Payroll",
      icon: Users,
      accessCheck: (u) => canAccessPayrollModule(u),
      children: payrollChildren,
    });
  }

  if (accountingChildren.length > 0) {
    items.push({
      title: "Accounting",
      icon: BookOpen,
      permission: PERMISSIONS.ACCOUNTING,
      children: accountingChildren,
    });
  }

  items.push({
    title: "Reports",
    icon: BarChart3,
    children: REPORTS_CHILDREN,
  });

  items.push({ title: "Settings", href: "/settings", icon: Settings, permission: PERMISSIONS.SETTINGS });

  return items;
}
