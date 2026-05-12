import {
  LayoutDashboard, ShoppingCart, ChefHat, QrCode, Armchair, Package, UtensilsCrossed,
  ClipboardList, Megaphone, Users, UserCog, BarChart3, BookOpen, Settings, Store,
  LogOut, Lock, Truck, UserCircle, Banknote, ListOrdered,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore, PERMISSIONS } from "@/stores/authStore";

type Item = { title: string; url: string; icon: any; perm?: string };

const mainItems: Item[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "POS Cashier", url: "/pos", icon: ShoppingCart, perm: PERMISSIONS.POS },
  { title: "Open bills", url: "/cashier", icon: Banknote, perm: PERMISSIONS.POS },
  { title: "Orders", url: "/orders", icon: ListOrdered, perm: PERMISSIONS.POS },
  { title: "Kitchen Display", url: "/kitchen", icon: ChefHat, perm: PERMISSIONS.KITCHEN },
  { title: "QR Orders", url: "/qr-orders", icon: QrCode, perm: PERMISSIONS.QR_ORDERS },
  { title: "Tables", url: "/tables", icon: Armchair, perm: PERMISSIONS.TABLES },
];

const managementItems: Item[] = [
  { title: "Menu", url: "/menu", icon: UtensilsCrossed, perm: PERMISSIONS.MENU },
  { title: "Inventory", url: "/inventory", icon: Package, perm: PERMISSIONS.INVENTORY },
  { title: "Suppliers", url: "/suppliers", icon: Truck, perm: PERMISSIONS.SUPPLIERS },
  { title: "Members", url: "/members", icon: UserCircle, perm: PERMISSIONS.MEMBERS },
  { title: "Purchases", url: "/purchases", icon: ClipboardList, perm: PERMISSIONS.PURCHASE },
  { title: "Promotions", url: "/promotions", icon: Megaphone, perm: PERMISSIONS.PROMOTIONS },
];

const adminItems: Item[] = [
  { title: "Payroll", url: "/payroll", icon: Users, perm: PERMISSIONS.PAYROLL },
  { title: "Accounting", url: "/accounting", icon: BookOpen, perm: PERMISSIONS.ACCOUNTING },
  { title: "Users & Roles", url: "/users", icon: UserCog, perm: PERMISSIONS.USERS },
  { title: "Reports", url: "/reports", icon: BarChart3, perm: PERMISSIONS.REPORTS },
  { title: "Settings", url: "/settings", icon: Settings, perm: PERMISSIONS.SETTINGS },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, hasPermission, logout, lock } = useAuthStore();

  const filterItems = (items: Item[]) => items.filter((i) => !i.perm || hasPermission(i.perm));

  const renderGroup = (label: string, items: Item[]) => {
    const visible = filterItems(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-wider font-semibold">
          {!collapsed && label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url} end={item.url === "/"}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="text-sm">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
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
