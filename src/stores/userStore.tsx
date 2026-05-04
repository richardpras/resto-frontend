import { create } from "zustand";
import { getApiAccessToken } from "@/lib/api-integration/client";
import * as um from "@/lib/api-integration/userManagementEndpoints";
import type { MeResponse } from "@/lib/api-integration/userManagementEndpoints";

export type UserStatus = "active" | "inactive";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  roleIds: string[];
  outletIds: string[];
  status: UserStatus;
  createdAt: string;
}

export interface RolePermissionRef {
  id: number;
  code: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissionRef[];
  isSystem?: boolean;
}

export interface Outlet {
  id: string;
  name: string;
}

export interface AuditLog {
  id: string;
  action: "create" | "update" | "deactivate" | "activate" | "delete";
  entity: "user" | "role";
  targetId: string;
  targetName: string;
  actor: string;
  timestamp: string;
  detail?: string;
}

export type PermissionCatalogItem = um.PermissionApiRow;

function mapUserFromApi(u: um.UserApiRow): AppUser {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    roleIds: (u.roles ?? []).map((r) => String(r.id)),
    outletIds: [],
    status: "active",
    createdAt: u.createdAt ?? "",
  };
}

function mapRoleFromApi(r: um.RoleApiRow): Role {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description ?? "",
    permissions: r.permissions ?? [],
    isSystem: false,
  };
}

interface UserStore {
  users: AppUser[];
  roles: Role[];
  permissionsCatalog: PermissionCatalogItem[];
  outlets: Outlet[];
  logs: AuditLog[];
  /** Current Passport user from `GET /auth/me` (roles + permissionCodes). */
  session: MeResponse | null;

  setSession: (session: MeResponse | null) => void;
  refreshSessionFromApi: () => Promise<void>;
  refreshUsersFromApi: () => Promise<void>;
  refreshRolesFromApi: () => Promise<void>;
  refreshPermissionsFromApi: () => Promise<void>;

  createUserWithRoles: (input: { name: string; email: string; password: string; roleIds: string[] }) => Promise<void>;
  assignUserRolesForUser: (userId: string, roleIds: string[]) => Promise<void>;
  createRoleViaApi: (input: { name: string; description: string }) => Promise<void>;
  assignRolePermissionsByIds: (roleId: string, permissionIds: number[]) => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  roles: [],
  permissionsCatalog: [],
  outlets: [],
  logs: [],
  session: null,

  setSession: (session) => set({ session }),

  refreshSessionFromApi: async () => {
    if (!getApiAccessToken()) {
      set({ session: null });
      return;
    }
    const meData = await um.me();
    set({ session: meData });
  },

  refreshUsersFromApi: async () => {
    const rows = await um.listUsers();
    set({ users: rows.map(mapUserFromApi) });
  },

  refreshRolesFromApi: async () => {
    const rows = await um.listRoles();
    set({ roles: rows.map(mapRoleFromApi) });
  },

  refreshPermissionsFromApi: async () => {
    const rows = await um.listPermissions();
    set({ permissionsCatalog: rows });
  },

  createUserWithRoles: async ({ name, email, password, roleIds }) => {
    const created = await um.createUser({ name, email, password });
    if (roleIds.length > 0) {
      await um.assignUserRoles(created.id, roleIds.map((id) => Number(id)));
    }
    await get().refreshUsersFromApi();
  },

  assignUserRolesForUser: async (userId, roleIds) => {
    await um.assignUserRoles(userId, roleIds.map((id) => Number(id)));
    await get().refreshUsersFromApi();
  },

  createRoleViaApi: async ({ name, description }) => {
    await um.createRole({ name, description: description || null });
    await get().refreshRolesFromApi();
  },

  assignRolePermissionsByIds: async (roleId, permissionIds) => {
    await um.assignRolePermissions(roleId, permissionIds);
    await get().refreshRolesFromApi();
  },
}));
