import type { TFunction } from "i18next";
import type { SidebarNavItem } from "./sidebarNavTypes";

export function translateNavItems(items: SidebarNavItem[], t: TFunction): SidebarNavItem[] {
  return items.map((item) => ({
    ...item,
    title: item.titleKey ? t(item.titleKey) : item.title,
    children: item.children ? translateNavItems(item.children, t) : undefined,
  }));
}
