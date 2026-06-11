import { Store, LogOut, Lock } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useOutletStore } from "@/stores/outletStore";
import { buildAdminItems, buildMainItems, buildManagementItems } from "@/components/sidebar/sidebarNavConfig";
import { filterNavItems } from "@/components/sidebar/sidebarNavUtils";
import { SidebarNavMenu } from "@/components/sidebar/SidebarNavMenu";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, hasPermission, logout, lock } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);

  useEffect(() => {
    if (!user) return;
    void fetchUnreadCount(activeOutletId);
  }, [user, activeOutletId, fetchUnreadCount]);

  const mainItems = useMemo(
    () => filterNavItems(buildMainItems(), user, hasPermission),
    [user, hasPermission],
  );
  const managementItems = useMemo(
    () => filterNavItems(buildManagementItems(user), user, hasPermission),
    [user, hasPermission],
  );
  const adminItems = useMemo(
    () => filterNavItems(buildAdminItems(user), user, hasPermission),
    [user, hasPermission],
  );

  const renderGroup = (label: string, items: ReturnType<typeof filterNavItems>) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-wider font-semibold">
          {!collapsed && label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarNavMenu items={items} unreadCount={unreadCount} />
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const initials = user?.name.split(" ").map((s) => s[0]).slice(0, 2).join("") ?? "U";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground">RestoHub</h2>
              <p className="text-[11px] text-sidebar-foreground/50">{user?.outletIds.length === 1 ? "Single outlet" : `${user?.outletIds.length ?? 0} outlets`}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {renderGroup("Operations", mainItems)}
        {renderGroup("Management", managementItems)}
        {renderGroup("Administration", adminItems)}
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-sidebar-primary">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? "Guest"}</p>
              <p className="text-[11px] text-sidebar-foreground/50">{user?.role ?? "—"}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex gap-1">
            {user?.pinSet ? (
              <button type="button" onClick={() => lock()} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <Lock className="h-3 w-3" /> Lock
              </button>
            ) : null}
            <button type="button" onClick={logout} className={`${user?.pinSet ? "flex-1" : "w-full"} flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors`}>
              <LogOut className="h-3 w-3" /> Logout
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
