import { Store, LogOut, Lock } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarFooter, SidebarHeader, SidebarLogoRail,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useOutletStore } from "@/stores/outletStore";
import { buildSidebarSections } from "@/components/sidebar/sidebarNavConfig";
import { translateNavItems } from "@/components/sidebar/sidebarNavI18n";
import { filterNavItems } from "@/components/sidebar/sidebarNavUtils";
import { SidebarNavMenu } from "@/components/sidebar/SidebarNavMenu";
import type { SidebarNavItem } from "@/components/sidebar/sidebarNavTypes";

export function AppSidebar() {
  const { t } = useTranslation("common");
  const { user, hasPermission, logout, lock } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);

  useEffect(() => {
    if (!user) return;
    void fetchUnreadCount(activeOutletId);
  }, [user, activeOutletId, fetchUnreadCount]);

  const sections = useMemo(
    () =>
      buildSidebarSections(user)
        .map((section) => ({
          labelKey: section.labelKey,
          items: translateNavItems(filterNavItems(section.items, user, hasPermission), t),
        }))
        .filter((section) => section.items.length > 0),
    [user, hasPermission, t],
  );

  const renderGroup = (label: string, items: SidebarNavItem[]) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-wider font-semibold">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarNavMenu items={items} unreadCount={unreadCount} />
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const initials = user?.name.split(" ").map((s) => s[0]).slice(0, 2).join("") ?? "U";

  const logoMark = (
    <div className="h-9 w-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center shrink-0">
      <Store className="h-5 w-5 text-sidebar-primary" />
    </div>
  );

  return (
    <>
      <Sidebar collapsible="logo-only" className="border-r-0">
        <SidebarHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            {logoMark}
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground">RestoHub</h2>
              <p className="text-[11px] text-sidebar-foreground/50">
                {user?.outletIds.length === 1
                  ? t("sidebar.singleOutlet")
                  : t("sidebar.outletsCount", { count: user?.outletIds.length ?? 0 })}
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {sections.map((section) => (
            <div key={section.labelKey}>{renderGroup(t(section.labelKey), section.items)}</div>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-sidebar-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? t("sidebar.guest")}</p>
              <p className="text-[11px] text-sidebar-foreground/50">{user?.role ?? "—"}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {user?.pinSet ? (
              <button type="button" onClick={() => lock()} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <Lock className="h-3 w-3" /> {t("sidebar.lock")}
              </button>
            ) : null}
            <button type="button" onClick={logout} className={`${user?.pinSet ? "flex-1" : "w-full"} flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors`}>
              <LogOut className="h-3 w-3" /> {t("sidebar.logout")}
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarLogoRail>{logoMark}</SidebarLogoRail>
    </>
  );
}
