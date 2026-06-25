import { useMemo, type ReactNode } from "react";
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
  canManagePlatformSettings,
  hasAnyPermission,
} from "@/domain/permissionGates";
import { PaymentHealthHubSummary } from "@/components/payments/PaymentHealthHubSummary";
import { useErpTranslation } from "@/i18n/useErpTranslation";

type HubCardIcon = typeof BarChart3;

type HubCardStaticDef = {
  id: string;
  to: string;
  query?: string;
  icon: HubCardIcon;
  permissionHint?: string;
  isVisible: (user: AuthUser | null) => boolean;
  isEnabled: (user: AuthUser | null) => boolean;
  footer?: ReactNode;
};

type HubCardDef = HubCardStaticDef & {
  title: string;
  description: string;
  bullets?: string[];
};

const FINANCIAL_PERMISSIONS = [PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS] as const;

const HUB_SECTION_DEFS: { sectionKey: "executive" | "operations" | "commercial"; cardIds: string[] }[] = [
  {
    sectionKey: "executive",
    cardIds: [
      "executive-dashboard",
      "executive-sales-report",
      "financial-statements",
      "accounting-reconciliation",
      "gift-card-liability",
    ],
  },
  {
    sectionKey: "operations",
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
    sectionKey: "commercial",
    cardIds: ["loyalty-analytics", "procurement-analytics", "inventory-analytics"],
  },
];

const HUB_CARD_DEFS: HubCardStaticDef[] = [
  {
    id: "executive-dashboard",
    to: "/executive-dashboard",
    icon: LayoutDashboard,
    permissionHint: "reports.view",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
  },
  {
    id: "executive-sales-report",
    to: "/reports/executive-sales",
    icon: BarChart3,
    permissionHint: "reports.view",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.REPORTS]),
  },
  {
    id: "financial-statements",
    to: "/accounting",
    icon: BookOpen,
    permissionHint: "reports.view + accounting.manage",
    isVisible: (user) => hasAnyPermission(user, [...FINANCIAL_PERMISSIONS]),
    isEnabled: (user) => canViewFinancialStatements(user),
  },
  {
    id: "accounting-reconciliation",
    to: "/accounting",
    query: "?tab=recon",
    icon: Scale,
    permissionHint: "accounting.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
  },
  {
    id: "gift-card-liability",
    to: "/accounting",
    query: "?tab=recon",
    icon: Gift,
    permissionHint: "accounting.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.ACCOUNTING]),
  },
  {
    id: "operations-monitoring",
    to: "/",
    icon: LayoutDashboard,
    permissionHint: "pos.use",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
  },
  {
    id: "reservation-analytics",
    to: "/reservations",
    icon: CalendarDays,
    permissionHint: "pos.use",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.POS]),
  },
  {
    id: "payment-health",
    to: "/settings/payments/health",
    icon: ShieldCheck,
    permissionHint: "settings.manage",
    isVisible: (user) => canManagePlatformSettings(user),
    isEnabled: (user) => canManagePlatformSettings(user),
    footer: <PaymentHealthHubSummary />,
  },
  {
    id: "audit-center",
    to: "/system/audit",
    icon: ScrollText,
    permissionHint: "settings.manage",
    isVisible: (user) => canManagePlatformSettings(user),
    isEnabled: (user) => canManagePlatformSettings(user),
    footer: <AuditCenterHubSummary />,
  },
  {
    id: "system-health-center",
    to: "/system/health",
    icon: HeartPulse,
    permissionHint: "settings.manage",
    isVisible: (user) => canManagePlatformSettings(user),
    isEnabled: (user) => canManagePlatformSettings(user),
    footer: <SystemHealthHubSummary />,
  },
  {
    id: "bug-reports",
    to: "/system/bug-reports",
    icon: Bug,
    permissionHint: "settings.manage",
    isVisible: (user) => canManagePlatformSettings(user),
    isEnabled: (user) => canManagePlatformSettings(user),
  },
  {
    id: "system-reliability",
    to: "/system/failed-jobs",
    icon: ServerCrash,
    permissionHint: "settings.manage",
    isVisible: (user) => canManagePlatformSettings(user),
    isEnabled: (user) => canManagePlatformSettings(user),
    footer: <FailedJobsHubSummary />,
  },
  {
    id: "shift-close-operations",
    to: "/shift-close",
    icon: LockKeyhole,
    permissionHint: "finance.shift_close",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.FINANCE_SHIFT_CLOSE]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.FINANCE_SHIFT_CLOSE]),
  },
  {
    id: "loyalty-analytics",
    to: "/loyalty-programs",
    icon: Heart,
    permissionHint: "members.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.MEMBERS]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.MEMBERS]),
  },
  {
    id: "procurement-analytics",
    to: "/purchases",
    query: "?tab=analytics",
    icon: ClipboardList,
    permissionHint: "purchase.manage",
    isVisible: (user) => hasAnyPermission(user, [PERMISSIONS.PURCHASE]),
    isEnabled: (user) => hasAnyPermission(user, [PERMISSIONS.PURCHASE]),
  },
  {
    id: "inventory-analytics",
    to: "/dashboard/menu",
    icon: Package,
    permissionHint: "analytics.view",
    isVisible: (user) => hasAnyPermission(user, ["analytics.view"]),
    isEnabled: (user) => hasAnyPermission(user, ["analytics.view"]),
  },
];

export const HUB_CARD_IDS = HUB_CARD_DEFS.map((c) => c.id);

function useTranslatedHubCards(): HubCardDef[] {
  const { t } = useErpTranslation();

  return useMemo(
    () =>
      HUB_CARD_DEFS.map((def) => {
        const prefix = `reportsHub.cards.${def.id}`;
        const bulletsRaw = t(`${prefix}.bullets`, { returnObjects: true, defaultValue: {} });
        const bullets =
          bulletsRaw && typeof bulletsRaw === "object" && !Array.isArray(bulletsRaw)
            ? Object.values(bulletsRaw as Record<string, string>)
            : undefined;

        return {
          ...def,
          title: t(`${prefix}.title`),
          description: t(`${prefix}.description`),
          bullets: bullets && bullets.length > 0 ? bullets : undefined,
        };
      }),
    [t],
  );
}

function HubCardContent({
  card,
  enabled,
  permissionRequiredLabel,
  financialRestrictedMsg,
}: {
  card: HubCardDef;
  enabled: boolean;
  permissionRequiredLabel: string;
  financialRestrictedMsg: string;
}) {
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
                {permissionRequiredLabel}
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
            <p className="text-xs text-muted-foreground mt-2">{financialRestrictedMsg}</p>
          )}
          {enabled && card.footer ? card.footer : null}
        </div>
      </div>
    </Card>
  );
}

function HubCard({
  card,
  user,
  permissionRequiredLabel,
  financialRestrictedMsg,
}: {
  card: HubCardDef;
  user: AuthUser | null;
  permissionRequiredLabel: string;
  financialRestrictedMsg: string;
}) {
  const enabled = card.isEnabled(user);
  const destination = `${card.to}${card.query ?? ""}`;

  if (!enabled) {
    return (
      <div aria-disabled="true" title={financialRestrictedMsg}>
        <HubCardContent
          card={card}
          enabled={false}
          permissionRequiredLabel={permissionRequiredLabel}
          financialRestrictedMsg={financialRestrictedMsg}
        />
      </div>
    );
  }

  return (
    <Link to={destination} className="block">
      <HubCardContent
        card={card}
        enabled
        permissionRequiredLabel={permissionRequiredLabel}
        financialRestrictedMsg={financialRestrictedMsg}
      />
    </Link>
  );
}

export default function ReportsHub() {
  const { t } = useErpTranslation();
  const user = useAuthStore((s) => s.user);
  const hubCards = useTranslatedHubCards();
  const cardsById = Object.fromEntries(hubCards.map((c) => [c.id, c]));

  const permissionRequiredLabel = t("reportsHub.permissionRequired");
  const financialRestrictedMsg = t("reportsHub.financialRestricted");

  const visibleSections = HUB_SECTION_DEFS.map((section) => ({
    title: t(`reportsHub.sections.${section.sectionKey}`),
    cards: section.cardIds
      .map((id) => cardsById[id])
      .filter((card): card is HubCardDef => card != null && card.isVisible(user)),
  })).filter((section) => section.cards.length > 0);

  const totalVisible = visibleSections.reduce((sum, s) => sum + s.cards.length, 0);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("reportsHub.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("reportsHub.subtitle")}</p>
      </div>

      {visibleSections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {section.cards.map((card) => (
              <HubCard
                key={card.id}
                card={card}
                user={user}
                permissionRequiredLabel={permissionRequiredLabel}
                financialRestrictedMsg={financialRestrictedMsg}
              />
            ))}
          </div>
        </section>
      ))}

      {totalVisible === 0 && <p className="text-sm text-muted-foreground">{t("reportsHub.empty")}</p>}
    </div>
  );
}

/** @internal Exported for visibility tests */
export { HUB_CARD_DEFS, HUB_SECTION_DEFS, type HubCardDef, type HubCardStaticDef };
