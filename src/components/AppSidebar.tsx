import {
  LayoutDashboard,
  ShoppingCart,
  HandCoins,
  ChefHat,
  QrCode,
  Armchair,
  Package,
  UtensilsCrossed,
  ClipboardList,
  Megaphone,
  Users,
  BarChart3,
  Settings,
  Store,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "POS Cashier", url: "/pos", icon: ShoppingCart },
  { title: "Payment Cashier", url: "/cashier", icon: HandCoins },
  { title: "Kitchen Display", url: "/kitchen", icon: ChefHat },
  { title: "QR Orders", url: "/qr-orders", icon: QrCode },
  { title: "Tables", url: "/tables", icon: Armchair },
];

const managementItems = [
  { title: "Menu", url: "/menu", icon: UtensilsCrossed },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Purchases", url: "/purchases", icon: ClipboardList },
  { title: "Promotions", url: "/promotions", icon: Megaphone },
];

const adminItems = [
  { title: "Payroll", url: "/payroll", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-wider font-semibold">
        {!collapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
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
              <p className="text-[11px] text-sidebar-foreground/50">Main Outlet</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {renderGroup("Operations", mainItems)}
        {renderGroup("Management", managementItems)}
        {renderGroup("Administration", adminItems)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-sidebar-primary">JD</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">John Doe</p>
              <p className="text-[11px] text-sidebar-foreground/50">Owner</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
