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

function findFirstLeafHref(item: SidebarNavItem): string | undefined {
  if (item.href) return item.href;
  for (const child of item.children ?? []) {
    if (child.kind === "separator") continue;
    const href = findFirstLeafHref(child);
    if (href) return href;
  }
  return undefined;
}

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
  const showNotifBadge = item.href === "/notifications" && (unreadCount ?? 0) > 0;
  const showItemBadge = item.badge != null && Number(item.badge) > 0;

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
              {showNotifBadge ? (
                <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
                  {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                </Badge>
              ) : showItemBadge ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px] bg-amber-500/20 text-amber-950 dark:text-amber-100">
                  {Number(item.badge) > 99 ? "99+" : item.badge}
                </Badge>
              ) : null}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavSubTree({
  items,
  depth = 0,
}: {
  items: SidebarNavItem[];
  depth?: number;
}) {
  const location = useLocation();

  return (
    <>
      {items.map((child, index) => {
        if (child.kind === "separator") {
          return (
            <SidebarMenuSubItem
              key={child.titleKey ?? `separator-${index}`}
              className="pointer-events-none"
            >
              <span className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {child.title}
              </span>
            </SidebarMenuSubItem>
          );
        }

        if (child.children?.length) {
          return (
            <NavNestedGroup key={child.titleKey ?? child.title} item={child} depth={depth} />
          );
        }

        if (!child.href) return null;

        const childActive = isNavItemActive(location, child);
        return (
          <SidebarMenuSubItem key={child.href ?? child.titleKey ?? child.title}>
            <SidebarMenuSubButton asChild isActive={childActive} size="sm">
              <Link to={child.href}>{child.title}</Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </>
  );
}

function NavNestedGroup({ item, depth }: { item: SidebarNavItem; depth: number }) {
  const location = useLocation();
  const branchActive = isNavBranchActive(location, item);
  const [open, setOpen] = useState(branchActive);

  useEffect(() => {
    if (branchActive) setOpen(true);
  }, [branchActive]);

  return (
    <SidebarMenuSubItem>
      <Collapsible open={open} onOpenChange={setOpen} className="w-full">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
          <span>{item.title}</span>
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className={cn("mx-0 border-l-0 px-0", depth > 0 && "pl-2")}>
            <NavSubTree items={item.children ?? []} depth={depth + 1} />
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
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
    const firstChildHref = findFirstLeafHref(item);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={branchActive} tooltip={item.title}>
          {firstChildHref ? (
            <Link
              to={firstChildHref}
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
            <NavSubTree items={item.children ?? []} />
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
          <NavParent key={item.titleKey ?? item.title} item={item} collapsed={collapsed} />
        ) : item.href ? (
          <NavLeaf key={item.titleKey ?? item.title} item={item} collapsed={collapsed} unreadCount={unreadCount} />
        ) : null,
      )}
    </SidebarMenu>
  );
}
