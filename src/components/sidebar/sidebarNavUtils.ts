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

function pruneSeparatorChildren(children: SidebarNavItem[]): SidebarNavItem[] {
  const pruned: SidebarNavItem[] = [];
  for (let i = 0; i < children.length; i++) {
    const item = children[i];
    if (item.kind === "separator") {
      const hasLinkAfter = children.slice(i + 1).some((c) => c.kind !== "separator");
      if (hasLinkAfter) pruned.push(item);
      continue;
    }
    pruned.push(item);
  }
  while (pruned.length > 0 && pruned[pruned.length - 1]?.kind === "separator") {
    pruned.pop();
  }
  const collapsed: SidebarNavItem[] = [];
  for (const item of pruned) {
    if (item.kind === "separator" && collapsed[collapsed.length - 1]?.kind === "separator") {
      continue;
    }
    collapsed.push(item);
  }
  return collapsed;
}

export function filterNavItems(
  items: SidebarNavItem[],
  user: AuthUser | null,
  hasPermission: (perm: string) => boolean,
): SidebarNavItem[] {
  return items
    .map((item) => {
      if (item.kind === "separator") return item;
      if (item.children?.length) {
        const children = pruneSeparatorChildren(filterNavItems(item.children, user, hasPermission));
        if (children.length === 0) return null;
        return { ...item, children };
      }
      if (!canSeeNavItem(item, user, hasPermission)) return null;
      return item;
    })
    .filter((item): item is SidebarNavItem => item !== null);
}

export function isNavItemActive(location: Location, item: SidebarNavItem): boolean {
  if (item.kind === "separator" || !item.href) return false;
  const { pathname, tab } = parseNavHref(item.href);
  if (location.pathname !== pathname) return false;
  const currentTab = new URLSearchParams(location.search).get("tab");
  if (tab !== null) return currentTab === tab;
  return currentTab === null;
}

export function isNavBranchActive(location: Location, item: SidebarNavItem): boolean {
  if (item.children?.length) {
    return item.children.some((child) => {
      if (child.kind === "separator") return false;
      return isNavBranchActive(location, child);
    });
  }
  return isNavItemActive(location, item);
}
