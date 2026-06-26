import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Wifi, WifiOff, Lock } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LockScreen } from "@/components/auth/LockScreen";
import { IdleTracker } from "@/components/auth/ProtectedRoute";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { useOutletStore } from "@/stores/outletStore";
import { BugReportButton } from "@/components/bug-report/BugReportButton";
import { SoundAlertPrompt } from "@/components/sound/SoundAlertPrompt";
import { StaffInstallPrompt } from "@/components/pwa/StaffInstallPrompt";
import { SoundAlertsProvider } from "@/components/sound/SoundAlertsProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

type OutletRow = { id: number; code?: string | null; name: string };

function OutletSelector({
  outlets,
  activeOutletId,
  onSelect,
  triggerClassName,
}: {
  outlets: OutletRow[];
  activeOutletId: number | null;
  onSelect: (id: number, code: string | null) => void;
  triggerClassName?: string;
}) {
  const { t } = useTranslation("common");

  return (
    <Select
      value={typeof activeOutletId === "number" && activeOutletId >= 1 ? String(activeOutletId) : ""}
      onValueChange={(v) => {
        const id = Number(v);
        const row = outlets.find((o) => o.id === id);
        if (row) onSelect(row.id, row.code ?? null);
      }}
    >
      <SelectTrigger className={triggerClassName} aria-label={t("header.activeOutlet")}>
        <SelectValue placeholder={t("header.outletPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {outlets.map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            <span className="flex flex-col items-start gap-0">
              <span>{o.name}</span>
              {o.code ? <span className="text-xs text-muted-foreground font-mono">{o.code}</span> : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const [online] = useState(true);
  const { user, locked, lock } = useAuthStore();
  const location = useLocation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hydrateFromApiOutlets = useOutletStore((s) => s.hydrateFromApiOutlets);
  const setActiveOutletContext = useOutletStore((s) => s.setActiveOutletContext);

  const selectorOutlets = user?.assignedOutlets;

  useEffect(() => {
    if (!user) return;
    const rows = selectorOutlets ?? [];
    if (rows.length === 0) {
      hydrateFromApiOutlets([]);
      return;
    }
    hydrateFromApiOutlets(
      rows.map((o) => ({
        id: o.id,
        code: o.code ?? "",
        name: o.name,
        address: "",
        phone: "",
        manager: "",
        status: "active" as const,
      })),
    );
  }, [user, selectorOutlets, hydrateFromApiOutlets]);

  useEffect(() => {
    if (user && !user.pinSet && locked) {
      useAuthStore.setState({ locked: false });
    }
  }, [user, user?.pinSet, locked]);

  // No chrome on login page and standalone public QR menu route only.
  // NOTE: use exact-match (with optional trailing slash) so "/qr-orders" stays in admin shell.
  const isStandalonePublicQr = /^\/qr-order\/?$/.test(location.pathname);
  if (location.pathname === "/login" || isStandalonePublicQr) {
    return <>{children}</>;
  }

  if (!user) return <>{children}</>;

  return (
    <SidebarProvider>
      <IdleTracker />
      {locked && user?.pinSet ? <LockScreen /> : null}
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <SoundAlertsProvider />
          <div data-app-chrome>
            <StaffInstallPrompt />
            <SoundAlertPrompt />
          </div>
          <header
            data-app-chrome
            className="h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-chrome"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <SidebarTrigger aria-label={t("header.toggleSidebar")} />
              {(selectorOutlets?.length ?? 0) > 0 && (
                <>
                  <div className="hidden sm:flex items-center gap-2 min-w-[200px] max-w-[min(360px,40vw)]">
                    <OutletSelector
                      outlets={selectorOutlets ?? []}
                      activeOutletId={activeOutletId}
                      onSelect={(id, code) => setActiveOutletContext(id, code)}
                      triggerClassName="h-9 text-xs"
                    />
                  </div>
                  <div className="flex sm:hidden items-center gap-2 min-w-0 flex-1 max-w-[min(220px,50vw)]">
                    <OutletSelector
                      outlets={selectorOutlets ?? []}
                      activeOutletId={activeOutletId}
                      onSelect={(id, code) => setActiveOutletContext(id, code)}
                      triggerClassName="h-9 text-sm min-h-11"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher variant="header" />
              {online ? (
                <div className="flex items-center gap-1.5 text-success text-xs font-medium">
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("header.online")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-warning text-xs font-medium animate-pulse-soft">
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("header.offline")}</span>
                </div>
              )}
              {user.pinSet ? (
                <button type="button" onClick={() => lock()} className="p-2 rounded-lg hover:bg-muted transition-colors" title={t("header.lockScreen")}>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : null}
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
          <BugReportButton />
        </div>
      </div>
    </SidebarProvider>
  );
}
