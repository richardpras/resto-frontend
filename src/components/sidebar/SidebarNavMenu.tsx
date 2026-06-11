import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isNavBranchActive, isNavItemActive } from "./sidebarNavUtils";
import type { SidebarNavItem } from "./sidebarNavTypes";

type SidebarNavMenuProps = {
  items: SidebarNavItem[];
  unreadCount?: number;
};

function NavLeaf({
  item,
  collapsed,
  unreadCount,
}: {
  item: SidebarNavItem;
  collapsed: boolean;
  unreadCount?: number;
}) {
  const location = useLocation();
  const active = isNavItemActive(location, item);
  const Icon = item.icon;
  const showBadge = item.href === "/notifications" && (unreadCount ?? 0) > 0;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={collapsed ? item.title : undefined}>
        <NavLink
          to={item.href!}
          end={item.href === "/"}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        >
          {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
          {!collapsed && (
            <span className="text-sm flex-1 flex items-center justify-between gap-2">
              {item.title}
              {showBadge ? (
                <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
                  {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                </Badge>
              ) : null}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavParent({
  item,
  collapsed,
}: {
  item: SidebarNavItem;
  collapsed: boolean;
}) {
  const location = useLocation();
  const branchActive = isNavBranchActive(location, item);
  const [open, setOpen] = useState(branchActive);
  const Icon = item.icon;

  useEffect(() => {
    if (branchActive) setOpen(true);
  }, [branchActive]);

  if (collapsed) {
    const firstChild = item.children?.find((c) => c.href);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={branchActive} tooltip={item.title}>
          {firstChild?.href ? (
            <Link
              to={firstChild.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
            </Link>
          ) : (
            <span className="flex items-center justify-center">
              {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={branchActive}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
          >
            {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
            <span className="text-sm flex-1 text-left">{item.title}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-200",
                open && "rotate-90",
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => {
              const childActive = isNavItemActive(location, child);
              return (
                <SidebarMenuSubItem key={child.href ?? child.title}>
                  <SidebarMenuSubButton asChild isActive={childActive} size="sm">
                    <Link to={child.href!}>{child.title}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function SidebarNavMenu({ items, unreadCount }: SidebarNavMenuProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarMenu>
      {items.map((item) =>
        item.children?.length ? (
          <NavParent key={item.title} item={item} collapsed={collapsed} />
        ) : item.href ? (
          <NavLeaf key={item.title} item={item} collapsed={collapsed} unreadCount={unreadCount} />
        ) : null,
      )}
    </SidebarMenu>
  );
}
