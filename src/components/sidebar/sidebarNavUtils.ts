import type { Location } from "react-router-dom";
import type { AuthUser } from "@/stores/authStore";
import type { ParsedNavHref, SidebarNavItem } from "./sidebarNavTypes";

export function parseNavHref(href: string): ParsedNavHref {
  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  return { pathname, tab: params.get("tab") };
}

export function canSeeNavItem(
  item: SidebarNavItem,
  user: AuthUser | null,
  hasPermission: (perm: string) => boolean,
): boolean {
  if (item.devOnly && import.meta.env.PROD) return false;
  if (item.accessCheck) return item.accessCheck(user, hasPermission);
  if (item.permissionsAll?.length) {
    if (!item.permissionsAll.every((p) => hasPermission(p))) return false;
  }
  if (item.permissionsAny?.length) {
    if (!item.permissionsAny.some((p) => hasPermission(p))) return false;
  }
  if (item.permission && !hasPermission(item.permission)) return false;
  return true;
}

export function filterNavItems(
  items: SidebarNavItem[],
  user: AuthUser | null,
  hasPermission: (perm: string) => boolean,
): SidebarNavItem[] {
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = filterNavItems(item.children, user, hasPermission);
        if (children.length === 0) return null;
        return { ...item, children };
      }
      if (!canSeeNavItem(item, user, hasPermission)) return null;
      return item;
    })
    .filter((item): item is SidebarNavItem => item !== null);
}

export function isNavItemActive(location: Location, item: SidebarNavItem): boolean {
  if (!item.href) return false;
  const { pathname, tab } = parseNavHref(item.href);
  if (location.pathname !== pathname) return false;
  const currentTab = new URLSearchParams(location.search).get("tab");
  if (tab !== null) return currentTab === tab;
  return currentTab === null;
}

export function isNavBranchActive(location: Location, item: SidebarNavItem): boolean {
  if (item.children?.length) {
    return item.children.some((child) => isNavBranchActive(location, child));
  }
  return isNavItemActive(location, item);
}
