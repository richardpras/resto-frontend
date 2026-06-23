import {
  LayoutDashboard, ShoppingCart, ChefHat, QrCode, Armchair, CalendarDays, Package, UtensilsCrossed,
  ClipboardList, Users, UserCog, BarChart3, BookOpen, Settings,
  Truck, UserCircle, Banknote, ListOrdered, Gift, Building2, Briefcase, LockKeyhole, Bell,
} from "lucide-react";
import { PERMISSIONS } from "@/stores/authStore";
import { PAYROLL_TAB_GROUPS } from "@/domain/payrollTabGroups";
import { HR_PAYROLL_TAB_ROUTES } from "@/domain/hrRouteMap";
import {
  canViewEmployees,
  canViewFinancialStatements,
  getVisiblePayrollTabs,
  type PayrollTabKey,
} from "@/domain/permissionGates";
import type { AuthUser } from "@/stores/authStore";
import type { SidebarNavItem, SidebarNavSection } from "./sidebarNavTypes";

const PAYROLL_TAB_KEYS: Record<PayrollTabKey, string> = {
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
  return { title: "", titleKey, kind: "link", ...rest };
}

function hrPayrollLink(tab: PayrollTabKey): SidebarNavItem {
  return nav(PAYROLL_TAB_KEYS[tab], { href: HR_PAYROLL_TAB_ROUTES[tab] });
}

function buildHrNavGroups(user: AuthUser | null): SidebarNavItem[] {
  const visible = new Set(getVisiblePayrollTabs(user));
  const groups: SidebarNavItem[] = [];

  const setupPayrollTabs = PAYROLL_TAB_GROUPS[0].tabs.filter((tab) => visible.has(tab));
  const setupChildren: SidebarNavItem[] = [];
  if (canViewEmployees(user)) {
    setupChildren.push(nav("nav.employees", { href: "/hr/employees" }));
  }
  setupChildren.push(
    nav("nav.departments", { href: "/hr/departments", permission: PERMISSIONS.USERS }),
    nav("nav.positions", { href: "/hr/positions", permission: PERMISSIONS.USERS }),
    ...setupPayrollTabs.map(hrPayrollLink),
  );
  if (setupChildren.length > 0) {
    groups.push({ title: "", titleKey: "nav.hrGroupSetup", kind: "link", children: setupChildren });
  }

  const groupMeta = [
    { index: 1, titleKey: "nav.hrGroupDaily" },
    { index: 2, titleKey: "nav.hrGroupPayroll" },
    { index: 3, titleKey: "nav.hrGroupClose" },
  ] as const;

  for (const { index, titleKey } of groupMeta) {
    const tabs = PAYROLL_TAB_GROUPS[index].tabs.filter((tab) => visible.has(tab));
    if (tabs.length === 0) continue;
    groups.push({
      title: "",
      titleKey,
      kind: "link",
      children: tabs.map(hrPayrollLink),
    });
  }

  return groups;
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

export function buildSidebarSections(user: AuthUser | null): SidebarNavSection[] {
  const hrNavGroups = buildHrNavGroups(user);
  const accountingChildren = buildAccountingChildren(user);

  const customers: SidebarNavItem[] = [
    nav("nav.members", { href: "/members", icon: UserCircle, permission: PERMISSIONS.MEMBERS }),
    nav("nav.loyaltyMenu", {
      icon: Gift,
      children: [
        nav("nav.loyaltyDashboard", { href: "/loyalty-dashboard", permission: PERMISSIONS.LOYALTY_DASHBOARD }),
        nav("nav.loyaltyPrograms", { href: "/loyalty-programs", permission: PERMISSIONS.MEMBERS }),
        nav("nav.giftCards", { href: "/gift-cards", permission: PERMISSIONS.GIFT_CARDS }),
      ],
    }),
  ];

  const hr: SidebarNavItem[] = [
    nav("nav.usersRoles", { href: "/users", icon: UserCog, permission: PERMISSIONS.USERS }),
    ...hrNavGroups,
  ];

  const finance: SidebarNavItem[] = [];
  if (accountingChildren.length > 0) {
    finance.push(
      nav("nav.accountingMenu", { icon: BookOpen, permission: PERMISSIONS.ACCOUNTING, children: accountingChildren }),
    );
  }
  finance.push(nav("nav.reportsMenu", { icon: BarChart3, children: REPORTS_CHILDREN }));
  finance.push(nav("nav.settings", { href: "/settings", icon: Settings, permission: PERMISSIONS.SETTINGS }));

  return [
    {
      labelKey: "sidebar.overview",
      items: [
        nav("nav.dashboard", { href: "/", icon: LayoutDashboard }),
        nav("nav.notificationCenter", { href: "/notifications", icon: Bell }),
      ],
    },
    {
      labelKey: "sidebar.sales",
      items: [
        nav("nav.posCashier", { href: "/pos", icon: ShoppingCart, permission: PERMISSIONS.POS }),
        nav("nav.openBills", { href: "/cashier", icon: Banknote, permission: PERMISSIONS.POS }),
        nav("nav.orders", { href: "/orders", icon: ListOrdered, permission: PERMISSIONS.POS }),
        nav("nav.shiftClose", { href: "/shift-close", icon: LockKeyhole, permission: PERMISSIONS.FINANCE_SHIFT_CLOSE }),
      ],
    },
    {
      labelKey: "sidebar.floor",
      items: [
        nav("nav.kitchenDisplay", { href: "/kitchen", icon: ChefHat, permission: PERMISSIONS.KITCHEN }),
        nav("nav.qrOrders", { href: "/qr-orders", icon: QrCode, permission: PERMISSIONS.QR_ORDERS }),
        nav("nav.tables", { href: "/tables", icon: Armchair, permission: PERMISSIONS.TABLES }),
        nav("nav.reservationsMenu", {
          icon: CalendarDays,
          children: [
            nav("nav.reservations", { href: "/reservations", permission: PERMISSIONS.POS }),
            nav("nav.reservationOps", { href: "/reservations/operations", permission: PERMISSIONS.POS }),
          ],
        }),
      ],
    },
    {
      labelKey: "sidebar.menuStock",
      items: [
        nav("nav.menu", {
          icon: UtensilsCrossed,
          children: [
            nav("nav.menuItems", { href: "/menu", permission: PERMISSIONS.MENU }),
            nav("nav.menuCategories", { href: "/menu/categories", permission: PERMISSIONS.MENU }),
            nav("nav.menuCosting", { href: "/menu/costing", permission: PERMISSIONS.COST_VIEW }),
            nav("nav.menuIntelligence", { href: "/dashboard/menu", permission: PERMISSIONS.MENU_DASHBOARD }),
          ],
        }),
        nav("nav.inventory", { href: "/inventory", icon: Package, permission: PERMISSIONS.INVENTORY }),
        nav("nav.suppliers", { href: "/suppliers", icon: Truck, permission: PERMISSIONS.SUPPLIERS }),
        nav("nav.purchasesMenu", { icon: ClipboardList, permission: PERMISSIONS.PURCHASE, children: PURCHASES_CHILDREN }),
      ],
    },
    {
      labelKey: "sidebar.customers",
      items: customers,
    },
    {
      labelKey: "sidebar.hr",
      items: hr,
    },
    {
      labelKey: "sidebar.finance",
      items: finance,
    },
  ];
}
