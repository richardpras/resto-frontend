import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Gift,
  Heart,
  LayoutDashboard,
  Package,
  Scale,
  ScrollText,
  Bug,
  HeartPulse,
  ServerCrash,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";
import { SystemHealthHubSummary } from "@/components/system-health/SystemHealthHubSummary";
import { AuditCenterHubSummary } from "@/components/audit/AuditCenterHubSummary";
import { FailedJobsHubSummary } from "@/components/system/FailedJobsHubSummary";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, PERMISSIONS, type AuthUser } from "@/stores/authStore";
import {
  canViewFinancialStatements,
  FINANCIAL_STATEMENT_RESTRICTED_MSG,
  hasAnyPermission,
} from "@/domain/permissionGates";
import { PaymentHealthHubSummary } from "@/components/payments/PaymentHealthHubSummary";
import type { ReactNode } from "react";

type HubCardIcon = typeof BarChart3;

type HubCardDef = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
  to: string;
  query?: string;
  icon: HubCardIcon;
  permissionHint?: string;
  isVisible: (user: AuthUser | null) => boolean;
  isEnabled: (user: AuthUser | null) => boolean;
  footer?: ReactNode;
};

const FINANCIAL_PERMISSIONS = [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] as const;

const HUB_SECTIONS: { title: string; cardIds: string[] }[] = [
  {
    title: "Executive",
    cardIds: [
      "executive-dashboard",
      "executive-sales-report",
      "financial-statements",
      "accounting-reconciliation",
      "gift-card-liability",
    ],
  },
  {
    title: "Operations",
    cardIds: [
      "operations-monitoring",
      "system-health-center",
      "reservation-analytics",
      "payment-health",
      "audit-center",
      "bug-reports",
      "system-reliability",
      "shift-close-operations",
    ],
  },
  {
    title: "Commercial",
    cardIds: ["loyalty-analytics", "procurement-analytics", "inventory-analytics"],
  },
];

const HUB_CARDS: HubCardDef[] = [
  {
    id: "executive-dashboard",
    title: "Owner Control Tower",
    description:
      "Cross-functional business overview combining sales, finance, operations, commercial performance, and alerts.",
    bullets: ["Executive Score", "Financial & Ops Health", "Commercial KPIs", "Alert Inbox"],
    to: "/executive-dashboard",
    icon: LayoutDashboard,
    permissionHint: "reports.view",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
  },
  {
    id: "executive-sales-report",
    title: "Executive Sales Report",
    description: "Gross sales, net sales, discounts, refunds, tender mix, and channel performance.",
    bullets: ["Gross & Net Sales", "Discount Breakdown", "Payment Mix", "Top Products", "Sales Trends"],
    to: "/reports/executive-sales",
    icon: BarChart3,
    permissionHint: "reports.view",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
  },
  {
    id: "financial-statements",
    title: "Financial Statements",
    description: "Trial Balance, Profit & Loss, Balance Sheet, Cash Flow, and General Ledger.",
    bullets: ["Trial Balance", "Profit & Loss", "Balance Sheet", "Cash Flow", "General Ledger"],
    to: "/accounting",
    icon: BookOpen,
    permissionHint: "reports.view + accounting.manage",
    isVisible: (user) => hasAnyPermission(user, [...FINANCIAL_PERMISSIONS]),
    isEnabled: (user) => canViewFinancialStatements(user),
  },
  {
    id: "accounting-reconciliation",
    title: "Accounting Reconciliation",
    description: "Subledger vs GL tie-out for AP, procurement, payroll, and gift cards.",
    bullets: ["AP Reconciliation", "Procurement Reconciliation", "Payroll Reconciliation", "Gift Card Reconciliation"],
    to: "/accounting",
    query: "?tab=recon",
    icon: Scale,
    permissionHint: "accounting.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
  },
  {
    id: "gift-card-liability",
    title: "Gift Card Liability",
    description: "Monitor gift card and store credit liability balances with variance alerts.",
    bullets: ["Gift Card Liability (2130)", "Store Credit Liability (2135)", "Variance Monitoring"],
    to: "/accounting",
    query: "?tab=recon",
    icon: Gift,
    permissionHint: "accounting.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
  },
  {
    id: "operations-monitoring",
    title: "Operations Monitoring",
    description: "Live kitchen, payment, printer, bridge, and offline sync signals.",
    bullets: ["Kitchen Queue", "Payment Success Rate", "Printer Queue", "Hardware Bridge", "Offline Sync"],
    to: "/",
    icon: LayoutDashboard,
    permissionHint: "pos.use",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
  },
  {
    id: "reservation-analytics",
    title: "Reservation Analytics",
    description: "Reservation volume, occupancy, and operational dashboard metrics.",
    to: "/reservations",
    icon: CalendarDays,
    permissionHint: "pos.use",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
  },
  {
    id: "payment-health",
    title: "Payment Health",
    description: "Gateway reliability, incident timeline, webhook and payment success trends.",
    bullets: ["Severity & Incidents", "Provider Reliability", "30-Day Trends"],
    to: "/settings/payments/health",
    icon: ShieldCheck,
    permissionHint: "settings.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    footer: <PaymentHealthHubSummary />,
  },
  {
    id: "audit-center",
    title: "Audit Center",
    description: "Centralized compliance timeline — operational, financial, and forensic change history.",
    bullets: ["Audit Timeline", "Entity History", "Risk Classification", "Global Search"],
    to: "/system/audit",
    icon: ScrollText,
    permissionHint: "settings.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    footer: <AuditCenterHubSummary />,
  },
  {
    id: "system-health-center",
    title: "System Health Center",
    description: "Unified platform health score, incidents, reliability trends, and priority action queue.",
    bullets: ["Platform Score", "Incident Timeline", "Priority Queue"],
    to: "/system/health",
    icon: HeartPulse,
    permissionHint: "settings.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    footer: <SystemHealthHubSummary />,
  },
  {
    id: "bug-reports",
    title: "Bug Reports",
    description: "User-submitted bug reports with screenshots, diagnostics, and triage workflow.",
    bullets: ["Screenshots", "Error Logs", "Status Workflow"],
    to: "/system/bug-reports",
    icon: Bug,
    permissionHint: "settings.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
  },
  {
    id: "system-reliability",
    title: "System Reliability",
    description: "Queue failure monitoring, critical job alerts, and background job health trends.",
    bullets: ["Failed Jobs", "Critical Failures", "Health Score"],
    to: "/system/failed-jobs",
    icon: ServerCrash,
    permissionHint: "settings.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.SETTINGS]),
    footer: <FailedJobsHubSummary />,
  },
  {
    id: "shift-close-operations",
    title: "Shift Close Operations",
    description: "End-of-shift preflight, cash reconciliation, inventory posting, and GL batch close.",
    bullets: ["Preflight Checks", "Cash Variance", "Inventory Posting", "Journal Preview"],
    to: "/shift-close",
    icon: LockKeyhole,
    permissionHint: "finance.shift_close",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.FINANCE_SHIFT_CLOSE]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.FINANCE_SHIFT_CLOSE]),
  },
  {
    id: "loyalty-analytics",
    title: "Loyalty Analytics",
    description: "Member engagement, voucher performance, and loyalty program trends.",
    to: "/loyalty-programs",
    icon: Heart,
    permissionHint: "members.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.MEMBERS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.MEMBERS]),
  },
  {
    id: "procurement-analytics",
    title: "Procurement Analytics",
    description: "Supplier performance, spend trends, and payables inside Purchases.",
    to: "/purchases",
    query: "?tab=analytics",
    icon: ClipboardList,
    permissionHint: "purchase.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.PURCHASE]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.PURCHASE]),
  },
  {
    id: "inventory-analytics",
    title: "Inventory Analytics",
    description: "Valuation, stock risk, dead-stock signals, and menu intelligence KPIs.",
    to: "/dashboard/menu",
    icon: Package,
    permissionHint: "analytics.view",
    isVisible: (user) => hasAnyPermission(user, ["analytics.view"]),
    isEnabled: (user) => hasAnyPermission(user, ["analytics.view"]),
  },
];

function HubCardContent({ card, enabled }: { card: HubCardDef; enabled: boolean }) {
  return (
    <Card
      className={`p-5 h-full transition-colors ${
        enabled ? "hover:border-primary/40" : "opacity-60 cursor-not-allowed border-dashed"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <card.icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{card.title}</h2>
            {!enabled && (
              <Badge variant="outline" className="text-xs bg-muted">
                Additional permission required
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
          {card.bullets && card.bullets.length > 0 && (
            <ul className="text-xs text-muted-foreground mt-2 space-y-0.5 list-disc list-inside">
              {card.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {card.permissionHint && (
            <p className="text-xs text-muted-foreground/80 mt-2 font-mono">{card.permissionHint}</p>
          )}
          {!enabled && card.id === "financial-statements" && (
            <p className="text-xs text-muted-foreground mt-2">{FINANCIAL_STATEMENT_RESTRICTED_MSG}</p>
          )}
          {enabled && card.footer ? card.footer : null}
        </div>
      </div>
    </Card>
  );
}

function HubCard({ card, user }: { card: HubCardDef; user: AuthUser | null }) {
  const enabled = card.isEnabled(user);
  const destination = `${card.to}${card.query ?? ""}`;

  if (!enabled) {
    return (
      <div aria-disabled="true" title={FINANCIAL_STATEMENT_RESTRICTED_MSG}>
        <HubCardContent card={card} enabled={false} />
      </div>
    );
  }

  return (
    <Link to={destination} className="block">
      <HubCardContent card={card} enabled />
    </Link>
  );
}

export default function ReportsHub() {
  const user = useAuthStore((s) => s.user);
  const cardsById = Object.fromEntries(HUB_CARDS.map((c) => [c.id, c]));

  const visibleSections = HUB_SECTIONS.map((section) => ({
    title: section.title,
    cards: section.cardIds
      .map((id) => cardsById[id])
      .filter((card): card is HubCardDef => card != null && card.isVisible(user)),
  })).filter((section) => section.cards.length > 0);

  const totalVisible = visibleSections.reduce((sum, s) => sum + s.cards.length, 0);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reports Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Executive reporting entry point. Each card opens an existing module — no duplicate report engines.
        </p>
      </div>

      {visibleSections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {section.cards.map((card) => (
              <HubCard key={card.id} card={card} user={user} />
            ))}
          </div>
        </section>
      ))}

      {totalVisible === 0 && (
        <p className="text-sm text-muted-foreground">No report modules are available for your role.</p>
      )}
    </div>
  );
}

/** @internal Exported for visibility tests */
export { HUB_CARDS, HUB_SECTIONS, type HubCardDef };
