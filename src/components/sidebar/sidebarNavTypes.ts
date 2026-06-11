import type { LucideIcon } from "lucide-react";
import type { AuthUser } from "@/stores/authStore";

export type SidebarNavItem = {
  title: string;
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
