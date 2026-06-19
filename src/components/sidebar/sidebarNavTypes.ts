import type { LucideIcon } from "lucide-react";
import type { AuthUser } from "@/stores/authStore";

export type SidebarNavItem = {
  /** Resolved display label (set by translateNavItems or legacy config). */
  title: string;
  /** i18n key under common namespace (e.g. nav.dashboard). */
  titleKey?: string;
  /** Non-clickable submenu section label when kind is separator. */
  kind?: "link" | "separator";
  href?: string;
  icon?: LucideIcon;
  permission?: string;
  permissionsAny?: string[];
  permissionsAll?: string[];
  accessCheck?: (user: AuthUser | null, hasPermission: (perm: string) => boolean) => boolean;
  children?: SidebarNavItem[];
  badge?: string | number;
  devOnly?: boolean;
};

export type ParsedNavHref = {
  pathname: string;
  tab: string | null;
};

export type SidebarNavSection = {
  labelKey: string;
  items: SidebarNavItem[];
};
